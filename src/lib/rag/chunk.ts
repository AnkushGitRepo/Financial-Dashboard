// Splits a document into overlapping, sentence-aligned windows for
// embedding (Phase 10 / ADR 0020). Pure and dependency-free so it unit-tests
// without any model or network — the indexer calls this, then `embed.ts`.
//
// Budgets are in characters. English averages ~4 chars/token, so the
// defaults (2400 / 300) are roughly a 600-token window with ~75-token
// overlap — comfortably inside a 512-token embedding model's context once
// tokenised, with headroom for multi-byte text.

export interface Chunk {
  /** 0-based position of this chunk within the source document. */
  index: number;
  text: string;
}

export interface ChunkOptions {
  /** Hard ceiling for a window. A single sentence longer than this is
   *  split by character. Default 2400. */
  maxChars?: number;
  /** How much of the tail of each window to repeat at the head of the
   *  next, so a fact spanning a boundary survives in at least one chunk.
   *  Clamped to < maxChars. Default 300. */
  overlapChars?: number;
  /** A trailing window shorter than this is merged back into the previous
   *  one rather than emitted alone. Default 160. */
  minChars?: number;
}

const DEFAULTS = { maxChars: 2400, overlapChars: 300, minChars: 160 } as const;

/** Collapse 3+ newlines to a paragraph break, trim trailing spaces on each
 *  line, and strip leading/trailing whitespace. Keeps single newlines. */
function normalize(input: string): string {
  return input
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Break text into sentence-ish units. Paragraph breaks are hard
 *  boundaries; within a paragraph, split after `.` `!` `?` (optionally
 *  followed by quotes/brackets) when the next char is whitespace. */
function splitSentences(text: string): string[] {
  const units: string[] = [];
  for (const para of text.split(/\n{2,}/)) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    const parts = trimmed.match(/[^.!?]+(?:[.!?]+(?:["'”’)\]]+)?|$)(?:\s+|$)/g);
    if (!parts) {
      units.push(trimmed);
      continue;
    }
    for (const p of parts) {
      const s = p.trim();
      if (s) units.push(s);
    }
  }
  return units;
}

/** Hard-split an over-long single unit on character count. */
function hardSplit(unit: string, maxChars: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < unit.length; i += maxChars) {
    out.push(unit.slice(i, i + maxChars).trim());
  }
  return out.filter(Boolean);
}

/** Take up to `overlapChars` from the end of `text`, aligned to a sentence
 *  start where one falls inside the window. */
function tailOverlap(text: string, overlapChars: number): string {
  if (overlapChars <= 0 || !text) return '';
  const tail = text.slice(-overlapChars);
  const m = tail.match(/[.!?]["'”’)\]]?\s+([\s\S]*)$/);
  const aligned = m ? m[1] : tail;
  return aligned.trim();
}

export function chunkText(input: string, options: ChunkOptions = {}): Chunk[] {
  const maxChars = Math.max(1, options.maxChars ?? DEFAULTS.maxChars);
  const overlapChars = Math.min(
    Math.max(0, options.overlapChars ?? DEFAULTS.overlapChars),
    maxChars - 1
  );
  const minChars = Math.max(0, options.minChars ?? DEFAULTS.minChars);

  const text = normalize(input);
  if (!text) return [];

  // Expand sentences, hard-splitting any that already exceed the ceiling.
  const units = splitSentences(text).flatMap((u) =>
    u.length > maxChars ? hardSplit(u, maxChars) : [u]
  );
  if (units.length === 0) return [];

  const texts: string[] = [];
  let buf = '';

  const flush = () => {
    const t = buf.trim();
    if (t) texts.push(t);
    buf = '';
  };

  for (const unit of units) {
    const candidate = buf ? `${buf} ${unit}` : unit;
    if (candidate.length > maxChars && buf) {
      const carry = tailOverlap(buf, overlapChars);
      flush();
      buf = carry ? `${carry} ${unit}` : unit;
    } else {
      buf = candidate;
    }
  }
  flush();

  // Merge a too-small tail back into its predecessor — but only when the
  // result still fits the ceiling, so this never overrides maxChars or
  // re-joins windows that were split for a good reason.
  if (texts.length >= 2 && texts[texts.length - 1].length < minChars) {
    const last = texts[texts.length - 1];
    const merged = `${texts[texts.length - 2]} ${last}`;
    if (merged.length <= maxChars) {
      texts.pop();
      texts[texts.length - 1] = merged;
    }
  }

  return texts.map((t, index) => ({ index, text: t }));
}
