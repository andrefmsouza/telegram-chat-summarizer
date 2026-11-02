# Telegram Chat Summarizer

Catch up on a busy Telegram group in a minute. This CLI reads the last hours of a group or forum topic and writes a short summary (overview, main topics, decisions and next steps) with the AI you choose:

| Provider | What it uses | Where the messages go |
|---|---|---|
| `openai` + local server | [LM Studio](https://lmstudio.ai), [Ollama](https://ollama.com), llama.cpp… | Nowhere: everything runs on your machine |
| `openai` + cloud API | OpenAI, OpenRouter, DeepSeek or any OpenAI-compatible API | To that provider |
| `claude-code` | [Claude Code](https://docs.claude.com/en/docs/claude-code) in headless mode, with your Claude login | To Anthropic, through your account |

## Highlights

- **Reasoning models handled properly.** The model's thinking is kept out of the summary, whether the server sends it in a separate field (`reasoning_content`) or inline as `<think>…</think>`, even when a tag is split across streamed chunks. Pass `--show-reasoning` to see it.
- **Privacy by default.** People become "Person 1", "Person 2"… before anything is sent to the AI. Use `--real-names` only if everyone is fine with it.
- **The session never shows up on screen.** `npm run login` writes it straight to `.env`. Your phone number and two-step password are not stored.
- **Prompt injection aware.** The transcript is sent as data, and the model is told to ignore instructions written in the chat.
- **Reads the whole period.** Messages are paged back until the start date, instead of stopping at a fixed count.

## Requirements

- Node.js 22 or newer
- A Telegram API ID and hash, from [my.telegram.org/apps](https://my.telegram.org/apps)
- One of the providers above

## Setup

```sh
git clone https://github.com/andrefmsouza/telegram-chat-summarizer.git
cd telegram-chat-summarizer
npm install
cp .env.example .env
```

Fill in `TELEGRAM_API_ID`, `TELEGRAM_API_HASH` and `TELEGRAM_CHAT` in `.env`, then log in once:

```sh
npm run login
```

> **Keep `.env` private.** The `TELEGRAM_SESSION` saved there gives full access to your Telegram account. If it ever leaks, end it in Telegram under *Settings → Devices*.

### Choosing the AI

**Local model with LM Studio** (start the server in the *Developer* tab):

```env
SUMMARY_PROVIDER=openai
AI_BASE_URL=http://localhost:1234/v1
AI_MODEL=qwen3-8b
```

**Ollama:** same as above with `AI_BASE_URL=http://localhost:11434/v1` and a model you have pulled.

**OpenAI or another cloud API:** set `AI_BASE_URL`, `AI_API_KEY` and `AI_MODEL`.

**Claude Code:** install it and log in once by running `claude`. Then:

```env
SUMMARY_PROVIDER=claude-code
# Optional: sonnet, opus or haiku
CLAUDE_CODE_MODEL=
```

It runs `claude -p` with every tool disabled and no saved session, so Claude only reads the transcript and writes text.

## Usage

```sh
# Last 48 hours of the chat set in .env
npm run summarize

# Last 12 hours of a specific topic, with Claude Code, saved to a file
npm run summarize -- --topic 42 --hours 12 --provider claude-code --output summary.md

# Summarize any text file instead of Telegram
npm run summarize -- --input chat-export.txt --language English
```

Progress messages go to stderr, so `npm run summarize > summary.md` keeps only the summary.

| Option | Default | |
|---|---|---|
| `--chat <id\|@name>` | `TELEGRAM_CHAT` | Group or channel to read |
| `--topic <id>` | `TELEGRAM_TOPIC_ID` | Forum topic |
| `--hours <n>` | `48` | How far back to read |
| `--max-messages <n>` | `2000` | Safety limit for very busy chats |
| `--input <file>` | | Summarize a text file instead of Telegram |
| `--provider <name>` | `SUMMARY_PROVIDER` | `openai` or `claude-code` |
| `--model <name>` | `AI_MODEL` / `CLAUDE_CODE_MODEL` | Model to use |
| `--language <name>` | `SUMMARY_LANGUAGE` | Language of the summary |
| `--real-names` | off | Send people's names to the AI |
| `--show-reasoning` | off | Print the model's reasoning |
| `--output <file>` | | Also save the summary to a file |

## How it works

```
Telegram ──▶ fetch messages ──▶ transcript ──▶ provider ──▶ split reasoning ──▶ summary
 (gramjs)    (paged by date)    (pseudonyms)   openai |     from answer         stdout / file
                                               claude-code
```

```
src/
  cli.ts               command line, ties everything together
  login.ts             one-time Telegram login
  config.ts            .env validation (zod)
  telegram.ts          client and message fetching
  transcript.ts        messages → text, with pseudonyms
  prompt.ts            instructions for the model
  reasoning.ts         streaming <think> splitter
  providers/
    openai.ts          any OpenAI-compatible API
    claude-code.ts     Claude Code headless (stream-json)
test/                  node:test suites
```

## Development

```sh
npm test            # unit tests
npm run typecheck
npm run build       # compiles to dist/, exposes the `tg-summarize` command
```

## License

[MIT](LICENSE)
