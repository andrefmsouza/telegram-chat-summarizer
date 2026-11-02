import { z } from "zod";

/** Empty values in .env (e.g. `TELEGRAM_TOPIC_ID=`) count as "not set". */
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

const telegramSchema = z.object({
  TELEGRAM_API_ID: z.coerce.number().int().positive(),
  TELEGRAM_API_HASH: z.string().min(1),
  TELEGRAM_SESSION: optional(z.string()),
  TELEGRAM_CHAT: optional(z.string()),
  /** Name used by version 0.x, still accepted */
  TELEGRAM_GROUP_ID: optional(z.string()),
  TELEGRAM_TOPIC_ID: optional(z.coerce.number().int().positive()),
});

const summarySchema = z.object({
  SUMMARY_PROVIDER: optional(z.enum(["openai", "claude-code"])),
  SUMMARY_LANGUAGE: optional(z.string()),
  AI_BASE_URL: optional(z.string().url()),
  AI_API_KEY: optional(z.string()),
  AI_MODEL: optional(z.string()),
  CLAUDE_CODE_PATH: optional(z.string()),
  CLAUDE_CODE_MODEL: optional(z.string()),
});

export type Provider = "openai" | "claude-code";

export interface TelegramConfig {
  apiId: number;
  apiHash: string;
  session?: string;
  chat?: string;
  topicId?: number;
}

export interface SummaryConfig {
  provider: Provider;
  language: string;
  openai: { baseURL: string; apiKey: string; model?: string };
  claudeCode: { command: string; model?: string };
}

export class ConfigError extends Error {}

function parse<T extends z.ZodTypeAny>(schema: T, env: NodeJS.ProcessEnv): z.infer<T> {
  const result = schema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`);
    throw new ConfigError(`Invalid settings in .env:\n${problems.join("\n")}`);
  }
  return result.data;
}

export function loadTelegramConfig(env: NodeJS.ProcessEnv = process.env): TelegramConfig {
  const parsed = parse(telegramSchema, env);
  return {
    apiId: parsed.TELEGRAM_API_ID,
    apiHash: parsed.TELEGRAM_API_HASH,
    session: parsed.TELEGRAM_SESSION,
    chat: parsed.TELEGRAM_CHAT ?? parsed.TELEGRAM_GROUP_ID,
    topicId: parsed.TELEGRAM_TOPIC_ID,
  };
}

export function loadSummaryConfig(env: NodeJS.ProcessEnv = process.env): SummaryConfig {
  const parsed = parse(summarySchema, env);
  return {
    provider: parsed.SUMMARY_PROVIDER ?? "openai",
    language: parsed.SUMMARY_LANGUAGE ?? "Brazilian Portuguese",
    openai: {
      baseURL: parsed.AI_BASE_URL ?? "http://localhost:1234/v1",
      // Local servers ignore the key, but the OpenAI SDK refuses an empty one
      apiKey: parsed.AI_API_KEY ?? "not-needed",
      model: parsed.AI_MODEL,
    },
    claudeCode: {
      command: parsed.CLAUDE_CODE_PATH ?? "claude",
      model: parsed.CLAUDE_CODE_MODEL,
    },
  };
}

/** Loads .env from the current folder, if there is one. Real environment variables win. */
export function loadEnvFile(path = ".env") {
  try {
    process.loadEnvFile(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
