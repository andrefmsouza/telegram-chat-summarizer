import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { Logger, LogLevel } from "telegram/extensions/Logger";
import axios from "axios";
import "dotenv/config";

// Telegram Configuration
const AI_API_URL = process.env.AI_API_URL || "";
const AI_MODEL = process.env.AI_MODEL || "";
const TELEGRAM_API_ID: number = Number(process.env.TELEGRAM_API_ID);
const TELEGRAM_API_HASH: string = process.env.TELEGRAM_API_HASH || "";
const TELEGRAM_SESSION: string = process.env.TELEGRAM_SESSION || "";
const TELEGRAM_GROUP_ID: string = process.env.TELEGRAM_GROUP_ID || "";
const TOPIC_ID = Number(process.env.TELEGRAM_TOPIC_ID) || 0;
const MESSAGE_LIMIT = 300;

const client = new TelegramClient(
  new StringSession(TELEGRAM_SESSION),
  TELEGRAM_API_ID,
  TELEGRAM_API_HASH,
  {
    connectionRetries: 5,
    baseLogger: new Logger(LogLevel.NONE),
  }
);

interface StreamResponse {
  choices: [{
    delta: {
      content: string;
    };
  }];
}

// Function to generate summary using AI
async function generateSummary(text: string, hideThinking: boolean = true){
  try {
    console.log("Generating summary");
    let isThinking = false;

    const response = await axios.post(
      AI_API_URL,
      {
        model: AI_MODEL,
        messages: [
          {
            role: "user",
            content: `Summarize the message exchange below in Brazilian Portuguese:\n\n${text}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 10000,
        stream: true,
      },
      {
        responseType: "stream",
        headers: {
          "Accept-Language": "pt-BR",
        },
      }
    );

    response.data.on("data", (chunk: any) => {
      const chunkString = chunk.toString();

      if (chunkString.startsWith("data: ")) {
        const cleanData = chunkString.replace(/^data: /, "");

        let jsonData: StreamResponse = {} as StreamResponse;
        try {
          jsonData = JSON.parse(cleanData);
        } catch (error) {
          jsonData = {} as StreamResponse;
        }

        if (jsonData.choices?.[0]?.delta?.content) {
          let content = jsonData.choices[0].delta.content;

          if (hideThinking && content.trim() === "<think>") {
            console.log("Waiting for the AI to generate the summary");
            isThinking = true;
          } else if (hideThinking && content.trim() === "</think>") {
            isThinking = false;
          } else if (!isThinking) {
            process.stdout.write( content);
          }
        }
      }
    });

  } catch (error) {
    console.error("Error generating summary:", error);
  }
}

// Function to fetch messages from a specific Telegram topic
async function fetchMessages(): Promise<string> {
  let textContent = "";
  try {
    console.log("Getting messages");
    await client.connect();
    const messages = await client.getMessages(TELEGRAM_GROUP_ID, {
      limit: MESSAGE_LIMIT,
      replyTo: TOPIC_ID,
    });

    const limitDate = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000) - 86400 * 2;

    messages.forEach((msg) => {
      if (msg.date >= limitDate) {
        const formattedDate = new Date(msg.date * 1000).toLocaleString("pt-BR");
        const userId = msg.fromId?.className === "PeerUser" ? msg.fromId.userId : "Unknown";
        textContent += `${formattedDate} | User: ${userId} | ${msg.message}\n`;
      }
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
  } finally {
    await client.disconnect();
    return textContent;
  }
}

// Main function
async function main() {
  const textContent = await fetchMessages();
  await generateSummary(textContent);
}

main();
