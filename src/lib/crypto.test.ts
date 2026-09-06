import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const KEY = Buffer.from(new Uint8Array(32).fill(7)).toString('base64');

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('SETTINGS_ENC_KEY', KEY);
});
afterEach(() => vi.unstubAllEnvs());

describe('crypto (AES-256-GCM)', () => {
  it('round-trips a value', async () => {
    const { encrypt, decrypt } = await import('./crypto');
    const secret = 'sk-ant-abc123-super-secret-key';
    const enc = encrypt(secret);
    expect(enc).not.toContain(secret);
    expect(enc.split('.')).toHaveLength(3);
    expect(decrypt(enc)).toBe(secret);
  });

  it('produces a different ciphertext each time (random IV)', async () => {
    const { encrypt } = await import('./crypto');
    expect(encrypt('same')).not.toBe(encrypt('same'));
  });

  it('rejects a tampered ciphertext', async () => {
    const { encrypt, decrypt } = await import('./crypto');
    const [iv, ct, tag] = encrypt('hello').split('.');
    const badCt = Buffer.from(ct, 'base64url');
    badCt[0] ^= 0xff;
    expect(() => decrypt([iv, badCt.toString('base64url'), tag].join('.'))).toThrow();
  });

  it('throws without a valid key', async () => {
    vi.stubEnv('SETTINGS_ENC_KEY', '');
    const { encrypt, isEncKeyConfigured } = await import('./crypto');
    expect(isEncKeyConfigured()).toBe(false);
    expect(() => encrypt('x')).toThrow(/SETTINGS_ENC_KEY/);
  });

  it('throws when the key is the wrong length', async () => {
    vi.stubEnv('SETTINGS_ENC_KEY', Buffer.from('short').toString('base64'));
    const { encrypt } = await import('./crypto');
    expect(() => encrypt('x')).toThrow(/32 bytes/);
  });
});
