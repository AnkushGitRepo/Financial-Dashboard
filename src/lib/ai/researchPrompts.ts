// Pure prompt builder for the Phase 10b research surface (ADR 0020
// amendment). The route does the async gathering (fundamentalsApi,
// retrieve) and hands the assembled facts + retrieved passages here; this
// stays string-only so the exact model input is easy to see and test.

import type { GroundingPassage } from '@/lib/rag/insightContext';

export type ResearchSubject =
  | { type: 'company'; symbol: string; name?: string }
  | { type: 'theme'; text: string }
  | { type: 'portfolio' }
  | { type: 'comparison'; symbols: string[]; names?: Record<string, string> };

/** A titled block of already-formatted facts the route assembled (e.g.
 *  "Valuation ratios", "Recent financials", "Holdings"). */
export interface FactBlock {
  heading: string;
  body: string;
}

export interface ResearchPromptInput {
  subject: ResearchSubject;
  factBlocks: FactBlock[];
  grounding: GroundingPassage[];
}

/** One-line statement of what's being researched. */
export function describeSubject(subject: ResearchSubject): string {
  switch (subject.type) {
    case 'company':
      return `Subject: research brief on ${subject.name ?? subject.symbol} (${subject.symbol}), an Indian-listed company.`;
    case 'theme':
      return `Subject: research brief on the theme "${subject.text.trim()}" as it applies to Indian markets.`;
    case 'portfolio':
      return "Subject: a research pass over the investor's whole portfolio.";
    case 'comparison': {
      const labels = subject.symbols.map((s) => {
        const name = subject.names?.[s];
        return name ? `${name} (${s})` : s;
      });
      return `Subject: a side-by-side comparison of ${labels.join(', ')}.`;
    }
  }
}

function groundingBlock(passages: GroundingPassage[]): string {
  if (passages.length === 0) {
    return 'Retrieved context: none available — base the brief on the structured facts above and say where detail is missing.';
  }
  return [
    'Retrieved context (indexed news / filings / the investor’s notes):',
    ...passages.map((p) => `- (${p.source}) ${p.text}`),
  ].join('\n');
}

export function buildResearchPrompt(input: ResearchPromptInput): string {
  const parts: string[] = [describeSubject(input.subject), ''];

  if (input.factBlocks.length === 0) {
    parts.push('Structured facts: none were available for this subject.', '');
  } else {
    for (const block of input.factBlocks) {
      parts.push(`### ${block.heading}`, block.body.trim(), '');
    }
  }

  parts.push(groundingBlock(input.grounding));
  return parts.join('\n').trim();
}
