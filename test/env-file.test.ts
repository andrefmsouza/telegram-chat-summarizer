import { test } from "node:test";
import assert from "node:assert/strict";
import { upsertEnvValue } from "../src/env-file";

test("replaces an existing value and keeps the other lines", () => {
  const before = "TELEGRAM_API_ID=1\nTELEGRAM_SESSION=\nAI_MODEL=x\n";
  assert.equal(upsertEnvValue(before, "TELEGRAM_SESSION", "abc"), 'TELEGRAM_API_ID=1\nTELEGRAM_SESSION="abc"\nAI_MODEL=x\n');
});

test("appends the value when the key is missing", () => {
  assert.equal(upsertEnvValue("A=1", "B", "2"), 'A=1\nB="2"\n');
  assert.equal(upsertEnvValue("", "B", "2"), 'B="2"\n');
});

test("does not touch keys that only start with the same name", () => {
  assert.equal(upsertEnvValue("TELEGRAM_SESSION_OLD=x\n", "TELEGRAM_SESSION", "y"), 'TELEGRAM_SESSION_OLD=x\nTELEGRAM_SESSION="y"\n');
});
