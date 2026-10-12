import { createECDH, randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decryptPayload, encryptPayload, MAX_PLAINTEXT } from './web-push.crypto';

// RFC 8291 §5 "Push Message Encryption Example" (published test vector, no real subscription).
const RFC = {
  plaintext: 'When I grow up, I want to be a watermelon',
  asPrivate: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
  uaPublic: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  uaPrivate: 'q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94',
  salt: 'DGv6ra1nlYgDCS1FRnbzlw',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg',
  body:
    'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
};
const b64 = (s: string) => Buffer.from(s, 'base64url');

describe('web push encryption (RFC 8291, aes128gcm)', () => {
  it('is byte-identical to the RFC 8291 §5 example', () => {
    const body = encryptPayload(Buffer.from(RFC.plaintext), { p256dh: RFC.uaPublic, auth: RFC.auth }, {
      serverPrivateKey: b64(RFC.asPrivate),
      salt: b64(RFC.salt),
    });
    expect(body.toString('base64url')).toBe(RFC.body);
  });

  it('the RFC body decrypts with the user agent key', () => {
    expect(decryptPayload(b64(RFC.body), { privateKey: b64(RFC.uaPrivate), auth: b64(RFC.auth) }).toString()).toBe(RFC.plaintext);
  });

  it('round trip with a fresh key pair and salt per message', () => {
    const ua = createECDH('prime256v1');
    ua.generateKeys();
    const auth = randomBytes(16);
    const keys = { p256dh: ua.getPublicKey('base64url'), auth: auth.toString('base64url') };
    const text = Buffer.from(JSON.stringify({ title: 'حلقة', body: 'x'.repeat(200) }));
    const a = encryptPayload(text, keys);
    const b = encryptPayload(text, keys);
    expect(a.equals(b)).toBe(false);
    expect(a.readUInt32BE(16)).toBe(4096);
    expect(decryptPayload(a, { privateKey: ua.getPrivateKey(), auth }).equals(text)).toBe(true);
  });

  it('refuses a payload larger than one record', () => {
    const ua = createECDH('prime256v1');
    ua.generateKeys();
    const keys = { p256dh: ua.getPublicKey('base64url'), auth: randomBytes(16).toString('base64url') };
    expect(() => encryptPayload(Buffer.alloc(MAX_PLAINTEXT + 1), keys)).toThrow('too large');
  });
});
