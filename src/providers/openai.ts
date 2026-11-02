import OpenAI from "openai";
import { ReasoningSplitter } from "../reasoning";
import type { Summarizer } from "./types";

export interface OpenAIOptions {
  baseURL: string;
  apiKey: string;
  model: string;
}

/** Fields some servers add to the streamed delta to send the reasoning separately */
type ReasoningDelta = { reasoning_content?: string | null; reasoning?: string | null };

/**
 * Any server that speaks the OpenAI Chat Completions API: LM Studio, Ollama,
 * llama.cpp, vLLM, OpenAI, OpenRouter, DeepSeek...
 */
export function createOpenAISummarizer(options: OpenAIOptions): Summarizer {
  const client = new OpenAI({ baseURL: options.baseURL, apiKey: options.apiKey });

  return {
    label: `${new URL(options.baseURL).host} (${options.model})`,

    async *summarize({ system, user }) {
      const stream = await client.chat.completions.create({
        model: options.model,
        stream: true,
        temperature: 0.3,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });

      // Reasoning can arrive in its own field or inline in the text, depending on the server
      const splitter = new ReasoningSplitter();
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta as (OpenAI.Chat.ChatCompletionChunk.Choice.Delta & ReasoningDelta) | undefined;
        const reasoning = delta?.reasoning_content ?? delta?.reasoning;
        if (reasoning) yield { type: "reasoning", text: reasoning };
        if (delta?.content) yield* splitter.push(delta.content);
      }
      yield* splitter.flush();
    },
  };
}
