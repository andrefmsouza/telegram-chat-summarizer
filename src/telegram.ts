import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { Logger, LogLevel } from "telegram/extensions/Logger";
import type { TelegramConfig } from "./config";
import type { ChatMessage } from "./transcript";

export function createClient(config: TelegramConfig, session = config.session ?? "") {
  return new TelegramClient(new StringSession(session), config.apiId, config.apiHash, {
    connectionRetries: 5,
    baseLogger: new Logger(LogLevel.NONE),
  });
}

export interface FetchOptions {
  chat: string;
  topicId?: number;
  since: Date;
  /** Safety limit for very busy chats */
  maxMessages: number;
}

type Sender = { firstName?: string; lastName?: string; title?: string; username?: string };

function displayName(sender: Sender | undefined): string | undefined {
  if (!sender) return undefined;
  const fullName = [sender.firstName, sender.lastName].filter(Boolean).join(" ");
  return fullName || sender.title || sender.username;
}

/** Reads messages newer than `since`, walking back page by page until it reaches that date. */
export async function fetchMessages(client: TelegramClient, options: FetchOptions): Promise<ChatMessage[]> {
  const sinceSeconds = Math.floor(options.since.getTime() / 1000);
  const messages: ChatMessage[] = [];

  for await (const message of client.iterMessages(options.chat, {
    replyTo: options.topicId,
    limit: options.maxMessages,
  })) {
    // Newest first: once we pass the start date, everything after is older
    if (message.date < sinceSeconds) break;
    if (!message.message) continue; // stickers, photos without caption, service messages

    messages.push({
      date: new Date(message.date * 1000),
      senderId: message.senderId?.toString() ?? "unknown",
      senderName: displayName(message.sender as Sender | undefined),
      text: message.message,
    });
  }

  return messages.reverse();
}
