import type { Prompt } from "../prompt";
import type { SummaryChunk } from "../reasoning";

export interface Summarizer {
  /** Shown to the user, e.g. "LM Studio (deepseek-r1)" */
  readonly label: string;
  summarize(prompt: Prompt): AsyncIterable<SummaryChunk>;
}
