import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTranscript, type ChatMessage } from "../src/transcript";

const at = (minute: number) => new Date(Date.UTC(2026, 0, 10, 12, minute));
const messages: ChatMessage[] = [
  { date: at(5), senderId: "2", senderName: "Bia", text: "Second\nwith two lines" },
  { date: at(1), senderId: "1", senderName: "Ana", text: "First" },
  { date: at(7), senderId: "1", senderName: "Ana", text: "   " },
  { date: at(9), senderId: "1", senderName: "Ana", text: "Third" },
];

test("orders by date, hides names and skips empty messages", () => {
  const transcript = buildTranscript(messages, { locale: "en-GB", timeZone: "UTC" });
  assert.equal(
    transcript,
    [
      "[10/01/2026, 12:01] Person 1: First",
      "[10/01/2026, 12:05] Person 2: Second\n    with two lines",
      "[10/01/2026, 12:09] Person 1: Third",
    ].join("\n"),
  );
});

test("uses real names only when asked", () => {
  const transcript = buildTranscript(messages, { realNames: true, locale: "en-GB", timeZone: "UTC" });
  assert.match(transcript, /Ana: First/);
  assert.match(transcript, /Bia: Second/);
  assert.doesNotMatch(transcript, /Person/);
});

test("returns an empty string when there is nothing to summarize", () => {
  assert.equal(buildTranscript([]), "");
});
