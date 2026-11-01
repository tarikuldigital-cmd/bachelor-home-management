// Password hashing (scrypt) + signed login tokens (HMAC-SHA256). No external packages.
import crypto from 'node:crypto';

const b64u = (buf) => Buffer.from(buf).toString('base64url');

export function createAuth(secret) {
  return {
    async hash(pw) {
      const salt = crypto.randomBytes(16);
      const key = crypto.scryptSync(pw, salt, 32);
      return `scrypt:${b64u(salt)}:${b64u(key)}`;
    },
    async verify(pw, stored) {
      const [kind, s, k] = String(stored || '').split(':');
      if (kind !== 'scrypt') return false;
      const key = crypto.scryptSync(pw, Buffer.from(s, 'base64url'), 32);
      const want = Buffer.from(k, 'base64url');
      return key.length === want.length && crypto.timingSafeEqual(key, want);
    },
    sign(payload) {
      const body = b64u(JSON.stringify({ ...payload, exp: Date.now() + 1000 * 60 * 60 * 24 * 60 }));
      const sig = b64u(crypto.createHmac('sha256', secret).update(body).digest());
      return `${body}.${sig}`;
    },
    verifyToken(token) {
      const [body, sig] = String(token).split('.');
      if (!body || !sig) return null;
      const want = b64u(crypto.createHmac('sha256', secret).update(body).digest());
      if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
      try {
        const p = JSON.parse(Buffer.from(body, 'base64url').toString());
        return p.exp > Date.now() ? p : null;
      } catch {
        return null;
      }
    },
  };
}
