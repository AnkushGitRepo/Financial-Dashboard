import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// --- mocks shared by the "enabled" suite ---
const limitFn = vi.fn();
class FakeRatelimit {
  static slidingWindow = vi.fn((n: number, w: string) => ({ n, w }));
  limit = limitFn;
}
vi.mock('@upstash/ratelimit', () => ({ Ratelimit: FakeRatelimit }));
vi.mock('@upstash/redis', () => ({ Redis: class {} }));
vi.mock('@/lib/currentUserId', () => ({ getCurrentUserId: vi.fn(async () => null) }));

const req = (headers: Record<string, string> = {}) =>
  new Request('https://x.test/api/holdings', { headers });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  limitFn.mockReset();
});

describe('rateLimit — disabled (no Upstash env)', () => {
  beforeEach(() => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
  });

  it('rateLimitEnabled is false and checkRateLimit passes everything', async () => {
    const rl = await import('./rateLimit');
    expect(rl.rateLimitEnabled).toBe(false);
    const r = await rl.checkRateLimit(req(), 'default');
    expect(r.ok).toBe(true);
    expect(limitFn).not.toHaveBeenCalled();
  });

  it('withRateLimit calls the handler unchanged', async () => {
    const rl = await import('./rateLimit');
    const inner = vi.fn(async () => new Response('ok'));
    const wrapped = rl.withRateLimit(inner, 'mcp');
    const res = await wrapped(req());
    expect(inner).toHaveBeenCalledOnce();
    expect(await res.text()).toBe('ok');
    expect(res.headers.get('RateLimit-Limit')).toBeNull();
  });
});

describe('rateLimit — enabled', () => {
  beforeEach(() => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://fake.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'tok');
  });

  it('keys anonymous callers by the first x-forwarded-for hop', async () => {
    limitFn.mockResolvedValue({ success: true, limit: 30, remaining: 29, reset: Date.now() + 60_000 });
    const rl = await import('./rateLimit');
    await rl.checkRateLimit(req({ 'x-forwarded-for': '9.9.9.9, 10.0.0.1' }), 'default', { userId: null });
    expect(limitFn).toHaveBeenCalledWith('ip:9.9.9.9');
  });

  it('keys signed-in callers by user id and uses the authed budget', async () => {
    limitFn.mockResolvedValue({ success: true, limit: 120, remaining: 119, reset: Date.now() + 60_000 });
    const rl = await import('./rateLimit');
    const r = await rl.checkRateLimit(req(), 'default', { userId: 'user_123' });
    expect(limitFn).toHaveBeenCalledWith('u:user_123');
    expect(r.limit).toBe(120);
  });

  it('withRateLimit returns a 429 with Retry-After when the budget is spent', async () => {
    const reset = Date.now() + 42_000;
    limitFn.mockResolvedValue({ success: false, limit: 15, remaining: 0, reset });
    const rl = await import('./rateLimit');
    const inner = vi.fn(async () => new Response('should not run'));
    const res = await rl.withRateLimit(inner, 'ai')(req(), undefined);
    expect(inner).not.toHaveBeenCalled();
    expect(res.status).toBe(429);
    expect(Number(res.headers.get('Retry-After'))).toBeGreaterThan(0);
    const body = await res.json();
    expect(body).toMatchObject({ success: false, data: null });
  });

  it('withRateLimit adds RateLimit-* headers to a successful response', async () => {
    limitFn.mockResolvedValue({ success: true, limit: 60, remaining: 41, reset: Date.now() + 30_000 });
    const rl = await import('./rateLimit');
    const res = await rl.withRateLimit(async () => new Response('ok'), 'mcp')(req());
    expect(res.headers.get('RateLimit-Limit')).toBe('60');
    expect(res.headers.get('RateLimit-Remaining')).toBe('41');
  });

  it('fails open when the limiter throws', async () => {
    limitFn.mockRejectedValue(new Error('upstash down'));
    const rl = await import('./rateLimit');
    const r = await rl.checkRateLimit(req(), 'default', { userId: 'u1' });
    expect(r.ok).toBe(true);
  });
});
