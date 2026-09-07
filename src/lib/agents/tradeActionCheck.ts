// Post-check for the Phase 11 synthesis (ADR 0021 "direction boundary").
// The synthesis prompt already forbids trade-action language; this is a
// cheap belt-and-braces scan so an off-prompt briefing is caught and
// regenerated once before it reaches the user.

const PATTERNS: RegExp[] = [
  // explicit actions
  /\b(buy|sell|short|accumulate|offload|book profits?)\s+(the\s+)?(stock|shares?|it|this)\b/i,
  /\b(should|would|could|recommend|advise|suggest)\s+(you|investors?|one|traders?)\s+(to\s+)?(buy|sell|hold|avoid|exit|enter|add|trim)\b/i,
  /\b(a\s+)?(buy|sell|hold|strong buy|strong sell)\s+(call|rating|recommendation|signal)\b/i,
  /\b(is|looks?|seems?|appears?)\s+(like\s+)?(a\s+)?(buy|sell|good buy|worth buying|worth selling)\b/i,
  /\b(time to|reason to)\s+(buy|sell|exit|enter|add|book)\b/i,
  // targets / valuation verdicts as a conclusion
  /\b(price|pt)\s+target\b/i,
  /\btarget\s+(price|of\s+₹|of\s+rs)/i,
  /\b(fair value|intrinsic value)\s+(is|of|around|near|at)\b/i,
  /\b(clearly|significantly|materially)\s+(over|under)valued\b/i,
  /\bwe\s+(rate|recommend|initiate)\b/i,
  // probability-of-move framing
  /\b\d{1,3}\s*%\s+(chance|probability|odds)\s+(of|that)\b.*\b(rise|fall|gain|drop|move|rally|decline)\b/i,
];

export interface TradeActionScan {
  ok: boolean;
  hits: string[];
}

export function scanForTradeActions(text: string): TradeActionScan {
  const hits: string[] = [];
  for (const re of PATTERNS) {
    const m = re.exec(text);
    if (m) hits.push(m[0].trim());
  }
  return { ok: hits.length === 0, hits };
}
