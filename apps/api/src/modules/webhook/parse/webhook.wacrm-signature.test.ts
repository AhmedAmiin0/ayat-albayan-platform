import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { signatureParts, verifyWacrmSignature } from './webhook.wacrm-signature';

// docs/19 «crm driver»: X-Wacrm-Signature = «t=<unix>,v1=<hex HMAC-SHA256(secret, `${t}.${rawBody}`)>», 5-minute window.

const SECRET = 'fake-wacrm-secret';
const NOW = new Date('2026-10-25T08:00:00Z');
const T = Math.floor(NOW.getTime() / 1000);
const raw = Buffer.from('{"id":"d-1","event":"message.status_updated","data":{}}');
const v1 = (t: number, secret = SECRET, body: Buffer = raw) => createHmac('sha256', secret).update(`${t}.${body.toString()}`).digest('hex');
const check = (header: string | undefined, over: { secret?: string; now?: Date; body?: Buffer } = {}) =>
  verifyWacrmSignature({ rawBody: over.body ?? raw, header, secret: 'secret' in over ? over.secret : SECRET, now: over.now ?? NOW });

describe('verifyWacrmSignature', () => {
  it('good: the HMAC over `${t}.${rawBody}`, either part order, upper-case hex', () => {
    expect(check(`t=${T},v1=${v1(T)}`)).toBe('ok');
    expect(check(`v1=${v1(T).toUpperCase()}, t=${T}`)).toBe('ok');
    expect(check(`t=${T - 299},v1=${v1(T - 299)}`)).toBe('ok');
  });

  it('bad: a wrong secret, a changed body, a changed t, malformed or missing', () => {
    expect(check(`t=${T},v1=${v1(T, 'other')}`)).toBe('bad');
    expect(check(`t=${T},v1=${v1(T)}`, { body: Buffer.from(`${raw.toString()} `) })).toBe('bad');
    expect(check(`t=${T + 1},v1=${v1(T)}`)).toBe('bad');
    expect(check(`sha256=${v1(T)}`)).toBe('bad');
    expect(check(undefined)).toBe('bad');
    expect(signatureParts('t=abc,v1=00')).toBeNull();
  });

  it('stale: a good signature older (or further ahead) than 5 minutes is a replay', () => {
    expect(check(`t=${T - 301},v1=${v1(T - 301)}`)).toBe('stale');
    expect(check(`t=${T + 301},v1=${v1(T + 301)}`)).toBe('stale');
  });

  it('fails closed without a secret or a raw body', () => {
    expect(check(`t=${T},v1=${v1(T, '')}`, { secret: undefined })).toBe('bad');
    expect(check(`t=${T},v1=${v1(T, '  ')}`, { secret: '  ' })).toBe('bad');
    expect(verifyWacrmSignature({ rawBody: undefined, header: `t=${T},v1=${v1(T)}`, secret: SECRET, now: NOW })).toBe('bad');
  });
});
