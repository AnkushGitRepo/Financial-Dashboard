import type { ChannelResult, NotificationPayload } from './types';

const WEBHOOK_TIMEOUT_MS = 5_000;

/** POST the notification to a user-supplied URL. Covers Telegram/Discord/
 * Slack incoming webhooks and is the zero-provider delivery path for
 * self-hosters (ADR 0014 §2). */
export async function sendWebhook(
  url: string,
  payload: NotificationPayload
): Promise<ChannelResult> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        kind: payload.kind,
        title: payload.title,
        body: payload.body,
        href: payload.href ?? null,
        meta: payload.meta ?? {},
      }),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });
    if (!response.ok) {
      return { channel: 'webhook', status: 'error', detail: `HTTP ${response.status}` };
    }
    return { channel: 'webhook', status: 'sent' };
  } catch (err) {
    return {
      channel: 'webhook',
      status: 'error',
      detail: err instanceof Error ? err.message : 'unknown error',
    };
  }
}

/** True once an email provider has been provisioned (Vercel Marketplace —
 * see ADR 0014's open dependencies) and its key is in the environment. */
export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Send one notification as an email.
 *
 * The provider SDK is deliberately NOT wired yet: ADR 0014 makes email
 * provisioning a user-in-the-loop step (pick + provision via the Vercel
 * Marketplace, decide a from-domain). Until then this is a clean seam —
 * it never throws, and reports `skipped` so a missing provider degrades to
 * "in-app only" rather than breaking the delivery path.
 */
export async function sendEmail(
  to: string,
  payload: NotificationPayload
): Promise<ChannelResult> {
  if (!emailConfigured()) {
    return { channel: 'email', status: 'skipped', detail: 'no email provider configured' };
  }
  // TODO(phase-5): wire the provisioned provider here (see ADR 0014). The
  // subject/body are already shaped so that step is just the transport.
  const subject = `[MarketMitra] ${payload.title}`;
  return {
    channel: 'email',
    status: 'skipped',
    detail: `provider key present but SDK not wired yet (would send "${subject}" to ${to})`,
  };
}
