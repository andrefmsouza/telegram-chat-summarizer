import { readFile, writeFile } from "node:fs/promises";

/** Sets `KEY="value"` in the contents of a .env file, replacing the line if it already exists. */
export function upsertEnvValue(content: string, key: string, value: string): string {
  const line = `${key}="${value}"`;
  const existing = new RegExp(`^${key}=.*$`, "m");
  if (existing.test(content)) return content.replace(existing, () => line);
  if (content === "") return `${line}\n`;
  return `${content.endsWith("\n") ? content : `${content}\n`}${line}\n`;
}

/** Writes a value to the .env file without ever printing it. */
export async function saveEnvValue(path: string, key: string, value: string) {
  let content = "";
  try {
    content = await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  // 0o600: only the current user can read it (ignored on Windows)
  await writeFile(path, upsertEnvValue(content, key, value), { mode: 0o600 });
}
