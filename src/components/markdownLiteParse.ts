// Pure parser for the tiny markdown subset the AI research brief uses
// (Phase 10b). The JSX renderer lives in MarkdownLite.tsx; this is the
// part worth unit-testing.

export type InlineToken =
  | { t: 'text'; v: string }
  | { t: 'strong'; v: string }
  | { t: 'em'; v: string };

export type Block =
  | { kind: 'h2' | 'h3' | 'h4' | 'p'; tokens: InlineToken[] }
  | { kind: 'ul'; items: InlineToken[][] };

export function parseInline(text: string): InlineToken[] {
  const out: InlineToken[] = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ t: 'text', v: text.slice(last, m.index) });
    if (m[2] !== undefined) out.push({ t: 'strong', v: m[2] });
    else out.push({ t: 'em', v: m[3] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ t: 'text', v: text.slice(last) });
  return out;
}

export function parseMarkdownLite(text: string): Block[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];
  let bullets: string[] = [];

  const flushPara = () => {
    if (para.length) {
      blocks.push({ kind: 'p', tokens: parseInline(para.join(' ')) });
      para = [];
    }
  };
  const flushList = () => {
    if (bullets.length) {
      blocks.push({ kind: 'ul', items: bullets.map(parseInline) });
      bullets = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = /^(#{2,4})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);

    if (heading) {
      flushPara();
      flushList();
      const kind = (['h2', 'h3', 'h4'] as const)[heading[1].length - 2];
      blocks.push({ kind, tokens: parseInline(heading[2]) });
    } else if (bullet) {
      flushPara();
      bullets.push(bullet[1]);
    } else if (line.trim() === '') {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  flushPara();
  flushList();
  return blocks;
}
