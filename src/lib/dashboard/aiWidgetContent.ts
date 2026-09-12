// Scripted content for the "Mitra" widget's "Proactive insight" tiles.
// The chat below them is real as of Phase 8 pt.5 (streamed via
// `/api/ai/chat`, ADR 0018) — these section-keyed proactive tiles are
// still a UI concept demo, tracked as a Phase 9+ follow-up.

export interface Insight {
  title: string;
  body: string;
}

export const INSIGHTS: Record<'dashboard' | 'portfolio' | 'markets' | 'stock', Insight[]> = {
  dashboard: [
    { title: "Banking holdings drove your gain", body: "Banking added ₹8,120 of today's ₹12,296 move — Meridian Finserv accounts for most of it." },
    { title: 'The index outran you today', body: 'MM Broad 50 closed +0.42% while your book moved +1.83% — the gap sits almost entirely in Energy.' },
    { title: 'One alert is close', body: 'Kaveri Power is within 1.2% of your ₹306 trigger. Want a reminder before the open?' },
  ],
  portfolio: [
    { title: 'Concentration risk in one name', body: 'Nova Infotech is 18.8% of the book against your 15% single-stock guardrail. Trimming 21 shares brings it back in range.' },
    { title: 'Materials is the widest drift', body: 'Materials sits 4.1 points under target, the only sleeve outside its band on the low side.' },
    { title: 'Two positions are underwater', body: 'SUNCON and GIRCEM are down a combined ₹7,850. Both trade below their 200-day average.' },
  ],
  markets: [
    { title: 'Breadth is narrower than the index', body: '1,412 advancing against 876 declining, but the gain is concentrated in banks and energy.' },
    { title: "Four of today's gainers are yours", body: 'KAVPWR, ASHMOT, TRIPHA and NOVATC all sit in your book — that is the ₹12,296 day move.' },
    { title: 'Volatility keeps easing', body: 'The volatility gauge is down 2.36% and at its lowest reading in six weeks.' },
  ],
  stock: [
    { title: 'Margins improved for a third quarter', body: 'Operating margin moved 28% → 31% over the last three quarters while sales grew 12%.' },
    { title: 'Promoter holding is steady', body: 'Promoters held 46.2% for five straight quarters, with no pledging disclosed.' },
    { title: 'Valuation vs. its own history', body: 'P/E of 18.4 sits slightly above the 5-year median of 16.1 for this company.' },
  ],
};
