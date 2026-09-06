import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificationPayload } from './types';

const send = vi.fn();
vi.mock('resend', () => ({
  Resend: class {
    emails = { send };
  },
}));

const { sendEmail } = await import('./channels');

const payload: NotificationPayload = {
  kind: 'alert',
  title: 'RELIANCE crossed ₹2,500',
  body: 'Your "above ₹2,500" alert fired. Last price ₹2,512.',
  href: '/dashboard/stock/RELIANCE',
};

beforeEach(() => {
  send.mockReset();
  vi.unstubAllEnvs();
});
afterEach(() => vi.unstubAllEnvs());

describe('sendEmail', () => {
  it('is a no-op "skipped" when RESEND_API_KEY is unset', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    const r = await sendEmail('u@example.com', payload);
    expect(r).toEqual({ channel: 'email', status: 'skipped', detail: 'no email provider configured' });
    expect(send).not.toHaveBeenCalled();
  });

  it('sends via Resend and reports "sent"', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    send.mockResolvedValue({ data: { id: 'e_1' }, error: null });

    const r = await sendEmail('u@example.com', payload);
    expect(r).toEqual({ channel: 'email', status: 'sent' });

    const arg = send.mock.calls[0][0];
    expect(arg.to).toBe('u@example.com');
    expect(arg.subject).toBe('[MarketMitra] RELIANCE crossed ₹2,500');
    expect(arg.from).toContain('onboarding@resend.dev'); // default when ALERT_EMAIL_FROM unset
    expect(arg.text).toContain('/dashboard/stock/RELIANCE');
    expect(arg.text).toContain('Not investment advice');
    expect(arg.html).toContain('Open MarketMitra');
  });

  it('honours ALERT_EMAIL_FROM', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('ALERT_EMAIL_FROM', 'MarketMitra <alerts@marketmitra.app>');
    send.mockResolvedValue({ data: { id: 'e_2' }, error: null });
    await sendEmail('u@example.com', payload);
    expect(send.mock.calls[0][0].from).toBe('MarketMitra <alerts@marketmitra.app>');
  });

  it('maps a provider error to "error", never throws', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    send.mockResolvedValue({ data: null, error: { message: 'domain not verified' } });
    const r = await sendEmail('u@example.com', payload);
    expect(r).toEqual({ channel: 'email', status: 'error', detail: 'domain not verified' });
  });

  it('catches an SDK throw', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    send.mockRejectedValue(new Error('network down'));
    const r = await sendEmail('u@example.com', payload);
    expect(r).toEqual({ channel: 'email', status: 'error', detail: 'network down' });
  });

  it('escapes HTML in the payload', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    send.mockResolvedValue({ data: { id: 'e_3' }, error: null });
    await sendEmail('u@example.com', { ...payload, title: '<script>x</script> & "co"' });
    const html = send.mock.calls[0][0].html as string;
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>x</script>');
  });
});
