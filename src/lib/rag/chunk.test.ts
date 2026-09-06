import { describe, expect, it } from 'vitest';
import { chunkText } from './chunk';

const lorem = (n: number) =>
  Array.from({ length: n }, (_, i) => `This is sentence number ${i + 1} in the document.`).join(' ');

describe('chunkText', () => {
  it('returns nothing for empty or whitespace-only input', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   \n\n  \t ')).toEqual([]);
  });

  it('keeps a short document as a single chunk', () => {
    const out = chunkText('Reliance rose 3% today. The Nifty closed flat.');
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({ index: 0, text: 'Reliance rose 3% today. The Nifty closed flat.' });
  });

  it('splits a long document into sequential, index-ordered chunks', () => {
    const out = chunkText(lorem(400), { maxChars: 500, overlapChars: 80 });
    expect(out.length).toBeGreaterThan(1);
    out.forEach((c, i) => expect(c.index).toBe(i));
    for (const c of out) expect(c.text.length).toBeLessThanOrEqual(500);
  });

  it('overlaps consecutive chunks so a boundary fact is not lost', () => {
    const out = chunkText(lorem(60), { maxChars: 300, overlapChars: 120 });
    expect(out.length).toBeGreaterThan(1);
    // The start of chunk N+1 repeats some text that appeared in chunk N.
    const firstWordsOfSecond = out[1].text.split(' ').slice(0, 4).join(' ');
    expect(out[0].text).toContain(firstWordsOfSecond);
  });

  it('hard-splits a single sentence longer than the ceiling', () => {
    const monster = 'word '.repeat(400).trim() + '.';
    const out = chunkText(monster, { maxChars: 200, overlapChars: 0 });
    expect(out.length).toBeGreaterThan(1);
    for (const c of out) expect(c.text.length).toBeLessThanOrEqual(200);
  });

  it('merges a tiny trailing chunk back when it still fits the ceiling', () => {
    const out = chunkText(lorem(20) + ' Tiny.', { maxChars: 2000, overlapChars: 0, minChars: 200 });
    expect(out.at(-1)!.text.endsWith('Tiny.')).toBe(true);
    // "Tiny." is far shorter than minChars, so it must not stand alone.
    expect(out.at(-1)!.text.length).toBeGreaterThan('Tiny.'.length);
  });

  it('does not merge a small tail if doing so would exceed the ceiling', () => {
    const out = chunkText('First para stays whole.\n\nSecond para is separate.', {
      maxChars: 40,
      overlapChars: 0,
      minChars: 200,
    });
    expect(out.map((c) => c.text)).toEqual(['First para stays whole.', 'Second para is separate.']);
  });

  it('normalizes CRLF and runs of blank lines', () => {
    const out = chunkText('a line.\r\n\r\n\r\n\r\nanother line.', { minChars: 0 });
    expect(out).toHaveLength(1);
    expect(out[0].text).not.toContain('\r');
    expect(out[0].text).toContain('a line.');
    expect(out[0].text).toContain('another line.');
  });
});
