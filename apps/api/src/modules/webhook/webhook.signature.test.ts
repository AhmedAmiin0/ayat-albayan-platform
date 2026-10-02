import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { safeEqual, verifyChallenge, verifySignature } from './webhook.signature';

const secret = 'stub-app-secret';
const body = Buffer.from('{"object":"whatsapp_business_account","entry":[]}');
const sig = (b: Buffer, s = secret) => `sha256=${createHmac('sha256', s).update(b).digest('hex')}`;

describe('verifySignature', () => {
  it('accepts the HMAC-SHA256 of the raw body', () => {
    expect(verifySignature({ rawBody: body, header: sig(body), secret })).toBe(true);
  });

  it('accepts an upper-case hex digest', () => {
    expect(verifySignature({ rawBody: body, header: sig(body).toUpperCase(), secret })).toBe(true);
  });

  it('rejects a signature made with another secret', () => {
    expect(verifySignature({ rawBody: body, header: sig(body, 'other'), secret })).toBe(false);
  });

  it('rejects a body changed after signing', () => {
    const header = sig(body);
    expect(verifySignature({ rawBody: Buffer.from(`${body.toString()} `), header, secret })).toBe(false);
  });

  it('rejects a missing header, a malformed header, a missing secret or a missing raw body', () => {
    expect(verifySignature({ rawBody: body, header: undefined, secret })).toBe(false);
    expect(verifySignature({ rawBody: body, header: 'sha256=abc', secret })).toBe(false);
    expect(verifySignature({ rawBody: body, header: sig(body).slice(7), secret })).toBe(false);
    expect(verifySignature({ rawBody: body, header: sig(body), secret: undefined })).toBe(false);
    expect(verifySignature({ rawBody: undefined, header: sig(body), secret })).toBe(false);
  });
});

describe('verifyChallenge', () => {
  const ok = { mode: 'subscribe', token: 'local-verify', challenge: '1158201444' };

  it('echoes the challenge when the token matches', () => {
    expect(verifyChallenge(ok, 'local-verify')).toBe('1158201444');
  });

  it('refuses a wrong token, another mode, a missing challenge or no configured token', () => {
    expect(verifyChallenge({ ...ok, token: 'nope' }, 'local-verify')).toBeNull();
    expect(verifyChallenge({ ...ok, mode: 'unsubscribe' }, 'local-verify')).toBeNull();
    expect(verifyChallenge({ mode: 'subscribe', token: 'local-verify' }, 'local-verify')).toBeNull();
    expect(verifyChallenge(ok, undefined)).toBeNull();
  });
});

describe('safeEqual', () => {
  it('compares by value and handles different lengths', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
