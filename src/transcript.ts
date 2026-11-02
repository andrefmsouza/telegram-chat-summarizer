export interface ChatMessage {
  date: Date;
  senderId: string;
  senderName?: string;
  text: string;
}

export interface TranscriptOptions {
  /** Use people's real names. By default they become "Person 1", "Person 2"... */
  realNames?: boolean;
  locale?: string;
  timeZone?: string;
}

/**
 * Turns the messages into the text sent to the AI, oldest first.
 * Names are replaced with stable pseudonyms unless `realNames` is set, so the
 * summary can still tell people apart without sending who they are.
 */
export function buildTranscript(messages: ChatMessage[], options: TranscriptOptions = {}): string {
  const { realNames = false, locale = "pt-BR", timeZone } = options;
  const pseudonyms = new Map<string, string>();
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short", timeZone });

  const speaker = (message: ChatMessage) => {
    if (realNames && message.senderName) return message.senderName;
    let alias = pseudonyms.get(message.senderId);
    if (!alias) {
      alias = `Person ${pseudonyms.size + 1}`;
      pseudonyms.set(message.senderId, alias);
    }
    return alias;
  };

  return [...messages]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .filter((message) => message.text.trim() !== "")
    .map((message) => {
      const body = message.text.trim().replace(/\n/g, "\n    ");
      return `[${dateFormat.format(message.date)}] ${speaker(message)}: ${body}`;
    })
    .join("\n");
}
