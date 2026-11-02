export interface SummaryChunk {
  type: "text" | "reasoning";
  text: string;
}

const OPEN = "<think>";
const CLOSE = "</think>";

/** How many characters at the end of `s` could be the start of `tag` (e.g. "...</thi"). */
function partialTagLength(s: string, tag: string): number {
  for (let n = Math.min(tag.length - 1, s.length); n > 0; n--) {
    if (tag.startsWith(s.slice(-n))) return n;
  }
  return 0;
}

/**
 * Separates the reasoning of models that write it inline (`<think>...</think>`,
 * as DeepSeek R1, Qwen and others do on local servers) from the answer itself.
 *
 * It works on a stream: tags split across chunks ("</thi" + "nk>") are handled
 * by holding back the few characters that might be the start of a tag.
 */
export class ReasoningSplitter {
  private buffer = "";
  private inside = false;
  private answerStarted = false;

  push(chunk: string): SummaryChunk[] {
    this.buffer += chunk;
    return this.drain(false);
  }

  /** Call at the end of the stream to release whatever is still buffered. */
  flush(): SummaryChunk[] {
    return this.drain(true);
  }

  private drain(final: boolean): SummaryChunk[] {
    let text = "";
    let reasoning = "";

    while (this.buffer) {
      const tag = this.inside ? CLOSE : OPEN;
      const index = this.buffer.indexOf(tag);
      const end = index !== -1 ? index : this.buffer.length - (final ? 0 : partialTagLength(this.buffer, tag));

      const piece = this.buffer.slice(0, end);
      if (this.inside) reasoning += piece;
      else text += piece;

      if (index === -1) {
        this.buffer = this.buffer.slice(end);
        break;
      }
      this.buffer = this.buffer.slice(index + tag.length);
      this.inside = !this.inside;
    }

    // Models usually leave blank lines between </think> and the answer
    if (!this.answerStarted) {
      text = text.trimStart();
      if (text) this.answerStarted = true;
    }

    const chunks: SummaryChunk[] = [];
    if (reasoning) chunks.push({ type: "reasoning", text: reasoning });
    if (text) chunks.push({ type: "text", text });
    return chunks;
  }
}
