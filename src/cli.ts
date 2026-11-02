#!/usr/bin/env node
import { createWriteStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { ConfigError, loadEnvFile, loadSummaryConfig, loadTelegramConfig, type Provider } from "./config";
import { buildPrompt } from "./prompt";
import { createSummarizer } from "./providers";
import { createClient, fetchMessages } from "./telegram";
import { buildTranscript } from "./transcript";

const HELP = `Summarize a Telegram group or topic with AI.

Usage: npm run summarize -- [options]

Source
  --chat <id|@name>      Group or channel (default: TELEGRAM_CHAT)
  --topic <id>           Forum topic (default: TELEGRAM_TOPIC_ID)
  --hours <n>            How far back to read (default: 48)
  --max-messages <n>     Safety limit for busy chats (default: 2000)
  --input <file>         Summarize a text file instead of reading Telegram

Summary
  --provider <name>      openai | claude-code (default: SUMMARY_PROVIDER)
  --model <name>         Model to use (default: AI_MODEL or CLAUDE_CODE_MODEL)
  --language <name>      Language of the summary (default: SUMMARY_LANGUAGE)
  --real-names           Send people's names to the AI (default: "Person 1", "Person 2"...)
  --show-reasoning       Print the model's reasoning, when it has any
  --output <file>        Also save the summary to a file

  -h, --help             Show this help
`;

function positiveInt(value: string, flag: string): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new ConfigError(`${flag} must be a positive whole number.`);
  return number;
}

async function readTranscript(args: { chat?: string; topic?: string; hours: string; "max-messages": string; "real-names": boolean }) {
  const config = loadTelegramConfig();
  if (!config.session) throw new ConfigError("No Telegram session yet. Run `npm run login` first.");

  const chat = args.chat ?? config.chat;
  if (!chat) throw new ConfigError("Tell me which chat to read: set TELEGRAM_CHAT in .env or pass --chat.");

  const client = createClient(config);
  try {
    await client.connect();
    if (!(await client.checkAuthorization())) {
      throw new ConfigError("The Telegram session expired or was revoked. Run `npm run login` again.");
    }

    const hours = positiveInt(args.hours, "--hours");
    const messages = await fetchMessages(client, {
      chat,
      topicId: args.topic ? positiveInt(args.topic, "--topic") : config.topicId,
      since: new Date(Date.now() - hours * 3_600_000),
      maxMessages: positiveInt(args["max-messages"], "--max-messages"),
    });
    console.error(`Read ${messages.length} messages from the last ${hours} hours.`);
    return buildTranscript(messages, { realNames: args["real-names"] });
  } finally {
    await client.destroy();
  }
}

async function main() {
  const { values: args } = parseArgs({
    options: {
      chat: { type: "string" },
      topic: { type: "string" },
      hours: { type: "string", default: "48" },
      "max-messages": { type: "string", default: "2000" },
      input: { type: "string" },
      provider: { type: "string" },
      model: { type: "string" },
      language: { type: "string" },
      "real-names": { type: "boolean", default: false },
      "show-reasoning": { type: "boolean", default: false },
      output: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (args.help) {
    console.log(HELP);
    return;
  }

  loadEnvFile();
  const summaryConfig = loadSummaryConfig();

  const provider = (args.provider ?? summaryConfig.provider) as Provider;
  if (provider !== "openai" && provider !== "claude-code") {
    throw new ConfigError(`Unknown provider "${provider}". Use openai or claude-code.`);
  }
  const summarizer = createSummarizer(summaryConfig, provider, args.model);

  const transcript = args.input ? await readFile(args.input, "utf8") : await readTranscript(args);
  if (!transcript.trim()) {
    console.error("No messages to summarize in this period.");
    return;
  }

  // Progress goes to stderr, so stdout can be piped or redirected with only the summary
  console.error(`Summarizing with ${summarizer.label}...\n`);
  const file = args.output ? createWriteStream(args.output) : undefined;
  let thinkingNotice = false;
  let reasoningOpen = false;

  for await (const chunk of summarizer.summarize(buildPrompt(transcript, args.language ?? summaryConfig.language))) {
    if (chunk.type === "reasoning") {
      if (args["show-reasoning"]) {
        process.stderr.write(`\x1b[2m${chunk.text}\x1b[0m`);
        reasoningOpen = true;
      } else if (!thinkingNotice) {
        console.error("The model is thinking...");
        thinkingNotice = true;
      }
      continue;
    }
    if (reasoningOpen) {
      process.stderr.write("\n\n"); // separates the reasoning from the summary
      reasoningOpen = false;
    }
    process.stdout.write(chunk.text);
    file?.write(chunk.text);
  }

  process.stdout.write("\n");
  if (file) {
    await new Promise<void>((resolve, reject) => file.end((error?: Error | null) => (error ? reject(error) : resolve())));
    console.error(`\nSaved to ${args.output}`);
  }
}

main().catch((error: unknown) => {
  // Only the message: full error objects can carry request headers (API keys)
  console.error(`\nError: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
