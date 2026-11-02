import { ConfigError, type Provider, type SummaryConfig } from "../config";
import { createClaudeCodeSummarizer } from "./claude-code";
import { createOpenAISummarizer } from "./openai";
import type { Summarizer } from "./types";

export type { Summarizer } from "./types";

export function createSummarizer(config: SummaryConfig, provider: Provider, model?: string): Summarizer {
  if (provider === "claude-code") {
    return createClaudeCodeSummarizer({ command: config.claudeCode.command, model: model ?? config.claudeCode.model });
  }

  const openaiModel = model ?? config.openai.model;
  if (!openaiModel) {
    throw new ConfigError("Set AI_MODEL in .env (or pass --model) to use the OpenAI-compatible provider.");
  }
  if (new URL(config.openai.baseURL).host === "api.openai.com" && config.openai.apiKey === "not-needed") {
    throw new ConfigError("AI_API_KEY is required to use the OpenAI API.");
  }
  return createOpenAISummarizer({ ...config.openai, model: openaiModel });
}
