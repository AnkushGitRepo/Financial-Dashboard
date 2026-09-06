import { isHosted } from '@/lib/deployment-mode';
import { emailConfigured, sendEmail, sendWebhook } from './channels';
import { insertNotification } from './store';
import type { ChannelResult, Notification, NotificationPayload } from './types';

export interface ChannelConfig {
  /** External email recipient, or false/undefined to skip email. */
  email?: string | false;
  /** External webhook URL, or false/undefined to skip. */
  webhook?: string | false;
}

export interface DeliveryOutcome {
  notification: Notification;
  results: ChannelResult[];
}

/**
 * The single fan-out point for every notification in the app (ADR 0014 §2).
 * Always writes the in-app record; then delivers to whichever external
 * channels are configured. Never throws for a channel failure — a bad
 * webhook or missing email provider must not lose the notification.
 */
export async function deliverNotification(
  userId: string,
  payload: NotificationPayload,
  channels: ChannelConfig = {}
): Promise<DeliveryOutcome> {
  const notification = await insertNotification(userId, payload);
  const results: ChannelResult[] = [{ channel: 'in_app', status: 'sent' }];

  if (channels.email) {
    results.push(await sendEmail(channels.email, payload));
  }
  if (channels.webhook) {
    results.push(await sendWebhook(channels.webhook, payload));
  }

  return { notification, results };
}

/**
 * Default external channels for a user, from environment config. Email/
 * webhook light up only when configured — never gated on `isHosted()`
 * (ADR 0014 §2): self-host has full parity when the operator sets the vars.
 *
 * - `ALERT_WEBHOOK_URL` — a single shared webhook (all users / the one
 *   self-host user).
 * - Email recipient: hosted mode resolves the Clerk user's primary email;
 *   self-host uses `ALERT_EMAIL_TO`. Either way email only sends once a
 *   provider is provisioned (`emailConfigured()`).
 */
export async function resolveChannels(userId: string): Promise<ChannelConfig> {
  const webhook = process.env.ALERT_WEBHOOK_URL || false;

  let email: string | false = false;
  if (emailConfigured()) {
    if (isHosted()) {
      email = (await resolveClerkEmail(userId)) ?? false;
    } else {
      email = process.env.ALERT_EMAIL_TO || false;
    }
  }

  return { email, webhook };
}

async function resolveClerkEmail(userId: string): Promise<string | null> {
  try {
    const { clerkClient } = await import('@clerk/nextjs/server');
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const primary = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId);
    return primary?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null;
  } catch {
    return null;
  }
}
