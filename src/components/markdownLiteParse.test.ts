import { describe, expect, it } from 'vitest';
import { parseInline, parseMarkdownLite } from './markdownLiteParse';

describe('parseInline', () => {
  it('splits **bold** and *italic* out of surrounding text', () => {
    expect(parseInline('a **b** and *c* here')).toEqual([
      { t: 'text', v: 'a ' },
      { t: 'strong', v: 'b' },
      { t: 'text', v: ' and ' },
      { t: 'em', v: 'c' },
      { t: 'text', v: ' here' },
    ]);
  });
  it('returns plain text unchanged', () => {
    expect(parseInline('nothing special')).toEqual([{ t: 'text', v: 'nothing special' }]);
  });
});

describe('parseMarkdownLite', () => {
  it('parses ## / ### headings', () => {
    const b = parseMarkdownLite('## What it is\n### Sub');
    expect(b.map((x) => x.kind)).toEqual(['h2', 'h3']);
  });

  it('groups consecutive bullets into one ul', () => {
    const b = parseMarkdownLite('- one\n- two\n- three');
    expect(b).toEqual([
      { kind: 'ul', items: [[{ t: 'text', v: 'one' }], [{ t: 'text', v: 'two' }], [{ t: 'text', v: 'three' }]] },
    ]);
  });

  it('joins wrapped lines into a paragraph, splits on a blank line', () => {
    const b = parseMarkdownLite('first line\ncontinued\n\nsecond');
    expect(b).toEqual([
      { kind: 'p', tokens: [{ t: 'text', v: 'first line continued' }] },
      { kind: 'p', tokens: [{ t: 'text', v: 'second' }] },
    ]);
  });

  it('separates a heading and a list that follow a paragraph with no blank line', () => {
    const b = parseMarkdownLite('some text\n## Risks\n- a risk');
    expect(b.map((x) => x.kind)).toEqual(['p', 'h2', 'ul']);
  });

  it('accepts * as a bullet marker too', () => {
    expect(parseMarkdownLite('* starred').map((x) => x.kind)).toEqual(['ul']);
  });
});
