import { test } from "node:test";
import assert from "node:assert/strict";
import { ReasoningSplitter, type SummaryChunk } from "../src/reasoning";

/** Feeds the chunks one by one and joins what came out of each kind */
function run(chunks: string[]) {
  const splitter = new ReasoningSplitter();
  const out: SummaryChunk[] = [...chunks.flatMap((chunk) => splitter.push(chunk)), ...splitter.flush()];
  const join = (type: SummaryChunk["type"]) => out.filter((c) => c.type === type).map((c) => c.text).join("");
  return { text: join("text"), reasoning: join("reasoning") };
}

test("text without reasoning passes through", () => {
  assert.deepEqual(run(["Hello ", "world"]), { text: "Hello world", reasoning: "" });
});

test("separates a <think> block that arrives in one chunk", () => {
  assert.deepEqual(run(["<think>plan it</think>\n\nThe summary."]), {
    text: "The summary.",
    reasoning: "plan it",
  });
});

test("handles tags split across chunks, even one character at a time", () => {
  const input = "<think>let me see</think>Answer here";
  assert.deepEqual(run([...input]), { text: "Answer here", reasoning: "let me see" });
  assert.deepEqual(run(["<thi", "nk>abc</th", "ink>", "ok"]), { text: "ok", reasoning: "abc" });
});

test("a '<' that is not a tag is not swallowed", () => {
  assert.deepEqual(run(["a <", "b and c <th"]), { text: "a <b and c <th", reasoning: "" });
});

test("an unfinished <think> at the end is still reasoning", () => {
  assert.deepEqual(run(["<think>never closed"]), { text: "", reasoning: "never closed" });
});

test("only trims the whitespace before the answer starts", () => {
  assert.deepEqual(run(["<think>x</think>", "\n\n", "Line 1\n", "\nLine 2"]), {
    text: "Line 1\n\nLine 2",
    reasoning: "x",
  });
});
