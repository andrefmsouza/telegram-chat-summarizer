import { test } from "node:test";
import assert from "node:assert/strict";
import { ClaudeStreamParser } from "../src/providers/claude-code";
import type { SummaryChunk } from "../src/reasoning";

const delta = (type: string, field: string, value: string) =>
  JSON.stringify({ type: "stream_event", event: { type: "content_block_delta", delta: { type, [field]: value } } });

function parseAll(lines: string[]): SummaryChunk[] {
  const parser = new ClaudeStreamParser();
  return [...lines.flatMap((line) => [...parser.parseLine(line)]), ...parser.finish()];
}

test("streams text and thinking deltas", () => {
  const chunks = parseAll([
    JSON.stringify({ type: "system", subtype: "init" }),
    delta("thinking_delta", "thinking", "hmm"),
    delta("text_delta", "text", "Hello "),
    delta("text_delta", "text", "there"),
    JSON.stringify({ type: "result", is_error: false, result: "Hello there" }),
  ]);
  assert.deepEqual(chunks, [
    { type: "reasoning", text: "hmm" },
    { type: "text", text: "Hello " },
    { type: "text", text: "there" },
  ]);
});

test("falls back to the final result when nothing was streamed", () => {
  const chunks = parseAll(["not json", "", JSON.stringify({ type: "result", is_error: false, result: "Full summary" })]);
  assert.deepEqual(chunks, [{ type: "text", text: "Full summary" }]);
});

test("throws when Claude Code reports an error", () => {
  assert.throws(
    () => parseAll([JSON.stringify({ type: "result", is_error: true, subtype: "error_during_execution" })]),
    /error_during_execution/,
  );
});
