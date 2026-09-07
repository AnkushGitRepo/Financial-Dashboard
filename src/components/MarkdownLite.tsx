// Thin JSX renderer over `parseMarkdownLite` (Phase 10b). Handles only the
// subset the AI research brief emits: `##`/`###`/`####` headings, `-`/`*`
// bullet lists, paragraphs, `**bold**` / `*italic*`. No links/images/HTML.

import { Fragment, type ReactNode } from 'react';
import { parseMarkdownLite, type InlineToken } from './markdownLiteParse';

function renderInline(tokens: InlineToken[]): ReactNode[] {
  return tokens.map((tok, i) => {
    if (tok.t === 'strong') return <strong key={i}>{tok.v}</strong>;
    if (tok.t === 'em') return <em key={i}>{tok.v}</em>;
    return <Fragment key={i}>{tok.v}</Fragment>;
  });
}

export function MarkdownLite({ text, className }: { text: string; className?: string }) {
  const blocks = parseMarkdownLite(text);
  return (
    <div className={className}>
      {blocks.map((block, i) => {
        if (block.kind === 'ul') {
          return (
            <ul key={i}>
              {block.items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        const content = renderInline(block.tokens);
        if (block.kind === 'h2') return <h2 key={i}>{content}</h2>;
        if (block.kind === 'h3') return <h3 key={i}>{content}</h3>;
        if (block.kind === 'h4') return <h4 key={i}>{content}</h4>;
        return <p key={i}>{content}</p>;
      })}
    </div>
  );
}
