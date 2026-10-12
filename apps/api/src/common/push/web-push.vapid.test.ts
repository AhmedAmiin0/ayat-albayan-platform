import { createECDH, createPublicKey } from 'node:crypto';
import { decodeProtectedHeader, jwtVerify } from 'jose';
import { describe, expect, it } from 'vitest';
import { VAPID_TTL_S, vapidAuthorization, type VapidKeys } from './web-push.vapid';

function keyPair(): VapidKeys {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  return { publicKey: ecdh.getPublicKey('base64url'), privateKey: ecdh.getPrivateKey('base64url'), subject: 'mailto:ops@example.com' };
}

const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc:def';
const NOW = new Date('2026-10-12T08:00:00Z');

describe('VAPID header (RFC 8292)', () => {
  it('is `vapid t=<ES256 JWT>, k=<public key>` that verifies with the public key', async () => {
    const keys = keyPair();
    const header = await vapidAuthorization(ENDPOINT, keys, NOW);
    const match = /^vapid t=([\w-]+\.[\w-]+\.[\w-]+), k=([\w-]+)$/.exec(header);
    expect(match?.[2]).toBe(keys.publicKey);
    const jwt = match?.[1] ?? '';
    expect(decodeProtectedHeader(jwt)).toEqual({ alg: 'ES256', typ: 'JWT' });
    const raw = Buffer.from(keys.publicKey, 'base64url');
    const jwk = { kty: 'EC', crv: 'P-256', x: raw.subarray(1, 33).toString('base64url'), y: raw.subarray(33).toString('base64url') };
    const { payload } = await jwtVerify(jwt, createPublicKey({ key: jwk, format: 'jwk' }), { currentDate: NOW });
    expect(payload).toEqual({ sub: 'mailto:ops@example.com', aud: 'https://fcm.googleapis.com', exp: NOW.getTime() / 1000 + VAPID_TTL_S });
  });

  it('expires within 12 hours and is scoped to the endpoint origin', async () => {
    const keys = keyPair();
    const header = await vapidAuthorization('https://updates.push.services.mozilla.com/wpush/v2/x', keys, NOW);
    const jwt = /t=([^,]+)/.exec(header)?.[1] ?? '';
    const body = JSON.parse(Buffer.from(jwt.split('.')[1] ?? '', 'base64url').toString()) as { aud: string; exp: number };
    expect(body.aud).toBe('https://updates.push.services.mozilla.com');
    expect(body.exp - NOW.getTime() / 1000).toBeLessThanOrEqual(12 * 3600);
  });

  it('rejects a malformed public key', async () => {
    await expect(vapidAuthorization(ENDPOINT, { ...keyPair(), publicKey: 'AAAA' })).rejects.toThrow('invalid VAPID public key');
  });
});
