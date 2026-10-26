import { createPrivateKey } from 'node:crypto';
import { SignJWT } from 'jose';

// RFC 8292 VAPID: the application server identifies itself to the push service with an ES256 JWT
// (aud = the endpoint's origin, exp ≤ 24 h; we use 12 h) and its public key.

/** The three WEB_PUSH_* values (env.web-push.ts); base64url keys as the key-generation one-liner prints them. */
export interface VapidKeys {
  publicKey: string;
  privateKey: string;
  /** mailto: or https: contact (the JWT `sub`). */
  subject: string;
}

export const VAPID_TTL_S = 12 * 60 * 60;

/** The P-256 private key as a KeyObject: d from the private key, x/y from the uncompressed public key. */
function signingKey(keys: VapidKeys) {
  const pub = Buffer.from(keys.publicKey, 'base64url');
  if (pub.length !== 65 || pub[0] !== 4) throw new Error('invalid VAPID public key');
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d: keys.privateKey,
    x: pub.subarray(1, 33).toString('base64url'),
    y: pub.subarray(33, 65).toString('base64url'),
  };
  return createPrivateKey({ key: jwk, format: 'jwk' });
}

/** The Authorization header for one endpoint: `vapid t=<jwt>, k=<public key>`. */
export async function vapidAuthorization(endpoint: string, keys: VapidKeys, now = new Date()): Promise<string> {
  const iat = Math.floor(now.getTime() / 1000);
  const jwt = await new SignJWT({ sub: keys.subject })
    .setProtectedHeader({ alg: 'ES256', typ: 'JWT' })
    .setAudience(new URL(endpoint).origin)
    .setExpirationTime(iat + VAPID_TTL_S)
    .sign(signingKey(keys));
  return `vapid t=${jwt}, k=${keys.publicKey}`;
}
