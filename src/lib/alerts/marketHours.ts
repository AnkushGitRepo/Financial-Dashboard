// NSE cash-market session gate for the alert-evaluation cron (ADR 0014 §3).
// The Vercel Cron fires on a coarse UTC window; the precise check lives
// here so a manual trigger and the cron share one definition.
//
// Deliberately NOT holiday-aware in v1 (ADR 0014): on a trading holiday the
// market simply doesn't move, so evaluators won't fire spuriously anyway.

const OPEN_MINUTES = 9 * 60 + 15; // 09:15 IST
// A few minutes past 15:30 so the post-close sweep still counts as "in session"
// and catches the closing print.
const CLOSE_MINUTES = 15 * 60 + 35; // 15:35 IST

const TRADING_DAYS = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);

interface IstParts {
  weekday: string;
  minutes: number;
}

function istParts(now: Date): IstParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const weekday = get('weekday');
  const hour = Number(get('hour')) % 24; // some engines emit "24" for midnight
  const minute = Number(get('minute'));
  return { weekday, minutes: hour * 60 + minute };
}

/** True when `now` falls inside the NSE cash session (Mon–Fri, ~09:15–15:35
 * IST). */
export function isNseSession(now: Date = new Date()): boolean {
  const { weekday, minutes } = istParts(now);
  if (!TRADING_DAYS.has(weekday)) return false;
  return minutes >= OPEN_MINUTES && minutes <= CLOSE_MINUTES;
}
