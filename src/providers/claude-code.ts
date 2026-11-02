import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import type { SummaryChunk } from "../reasoning";
import type { Summarizer } from "./types";

export interface ClaudeCodeOptions {
  /** Path to the `claude` executable */
  command: string;
  model?: string;
}

/** The parts of Claude Code's `--output-format stream-json` lines that we use */
interface StreamLine {
  type?: string;
  event?: { type?: string; delta?: { type?: string; text?: string; thinking?: string } };
  is_error?: boolean;
  result?: unknown;
  subtype?: string;
}

/** Reads the JSON lines Claude Code prints in headless mode and turns them into summary chunks. */
export class ClaudeStreamParser {
  private streamedText = false;
  private result?: string;
  private error?: string;

  *parseLine(line: string): Generator<SummaryChunk> {
    if (!line.trim()) return;
    let data: StreamLine;
    try {
      data = JSON.parse(line) as StreamLine;
    } catch {
      return; // not JSON (e.g. a warning): ignore
    }

    if (data.type === "stream_event" && data.event?.type === "content_block_delta") {
      const delta = data.event.delta;
      if (delta?.type === "text_delta" && delta.text) {
        this.streamedText = true;
        yield { type: "text", text: delta.text };
      } else if (delta?.type === "thinking_delta" && delta.thinking) {
        yield { type: "reasoning", text: delta.thinking };
      }
    } else if (data.type === "result") {
      if (data.is_error) this.error = typeof data.result === "string" ? data.result : (data.subtype ?? "unknown error");
      else if (typeof data.result === "string") this.result = data.result;
    }
  }

  /** The final result only matters if nothing was streamed (older Claude Code versions). */
  *finish(): Generator<SummaryChunk> {
    if (this.error) throw new Error(`Claude Code returned an error: ${this.error}`);
    if (!this.streamedText && this.result) yield { type: "text", text: this.result };
  }
}

/**
 * Uses Claude Code in headless mode (`claude -p`), with your own Claude login.
 * The transcript goes through stdin, so it is not limited by the size of a
 * command line, and every tool is disabled: Claude only reads and writes text.
 */
export function createClaudeCodeSummarizer(options: ClaudeCodeOptions): Summarizer {
  return {
    label: `Claude Code${options.model ? ` (${options.model})` : ""}`,

    async *summarize({ system, user }) {
      const args = [
        "-p",
        "--output-format", "stream-json",
        "--include-partial-messages",
        "--verbose",
        "--tools", "",
        "--no-session-persistence",
        "--system-prompt", system,
      ];
      if (options.model) args.push("--model", options.model);

      const child = spawn(options.command, args, { stdio: ["pipe", "pipe", "pipe"] });

      let stderr = "";
      child.stderr.setEncoding("utf8").on("data", (data: string) => (stderr += data));

      const exitCode = new Promise<number | null>((resolve, reject) => {
        child.on("error", (error: NodeJS.ErrnoException) => {
          reject(
            error.code === "ENOENT"
              ? new Error(`Could not find Claude Code ("${options.command}"). Install it or set CLAUDE_CODE_PATH in .env.`)
              : error,
          );
        });
        child.on("close", resolve);
      });
      exitCode.catch(() => {}); // awaited below; avoids an "unhandled rejection" while we read stdout

      child.stdin.on("error", () => {}); // the exit code below reports what went wrong
      child.stdin.end(user);

      const parser = new ClaudeStreamParser();
      for await (const line of createInterface({ input: child.stdout })) {
        yield* parser.parseLine(line);
      }

      const code = await exitCode;
      yield* parser.finish();
      if (code !== 0) {
        throw new Error(`Claude Code exited with code ${code}${stderr.trim() ? `: ${stderr.trim().slice(0, 500)}` : ""}`);
      }
    },
  };
}
