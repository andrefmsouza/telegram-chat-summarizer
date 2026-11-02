import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { loadEnvFile, loadTelegramConfig } from "./config";
import { saveEnvValue } from "./env-file";
import { createClient } from "./telegram";

/**
 * Logs in to Telegram once and stores the session in .env.
 * The session is never printed: it gives full access to the account.
 * Neither the phone number nor the 2FA password is saved anywhere.
 */
async function main() {
  loadEnvFile();
  const config = loadTelegramConfig();
  const client = createClient(config, "");
  const rl = createInterface({ input: stdin, output: stdout });

  try {
    await client.start({
      phoneNumber: () => rl.question("Phone number, with country code (e.g. +5531999999999): "),
      phoneCode: () => rl.question("Code Telegram just sent you: "),
      password: () => rl.question("Two-step verification password (only if you use one): "),
      onError: async (error) => {
        console.error(`Telegram: ${error.message}`);
        return true; // stop instead of retrying forever
      },
    });

    await saveEnvValue(".env", "TELEGRAM_SESSION", String(client.session.save()));
    console.log("\nLogged in. The session was saved to .env.");
    console.log("Keep that file private: anyone with the session can use your Telegram account.");
  } finally {
    rl.close();
    await client.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(`\nError: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
