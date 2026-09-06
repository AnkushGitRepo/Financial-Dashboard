import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// AES-256-GCM for secrets at rest (Phase 8: the user's BYO AI key).
// SETTINGS_ENC_KEY is 32 bytes, base64-encoded. Generate one with:
//   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

function key(): Buffer {
  const raw = process.env.SETTINGS_ENC_KEY;
  if (!raw) throw new Error('SETTINGS_ENC_KEY is not set');
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) {
    throw new Error('SETTINGS_ENC_KEY must decode to 32 bytes (base64 of crypto.randomBytes(32))');
  }
  return buf;
}

/** Returns `iv.ciphertext.tag`, all base64url, dot-joined. */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, ct, tag].map((b) => b.toString('base64url')).join('.');
}

/** Inverse of `encrypt`. Throws on a tampered or malformed value. */
export function decrypt(payload: string): string {
  const parts = payload.split('.');
  if (parts.length !== 3) throw new Error('malformed ciphertext');
  const [iv, ct, tag] = parts.map((p) => Buffer.from(p, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

export function isEncKeyConfigured(): boolean {
  try {
    key();
    return true;
  } catch {
    return false;
  }
}
