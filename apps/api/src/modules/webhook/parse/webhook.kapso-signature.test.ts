import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { presentSignatureHeaders, verifyKapsoSignature } from './webhook.kapso-signature';
import { verifySignature } from './webhook.signature';

// docs/19: Kapso signs with X-Webhook-Signature = hex HMAC-SHA256(raw body, KAPSO_WEBHOOK_SECRET).

const SECRET = 'fake-kapso-secret';
const META_SECRET = 'fake-meta-app-secret';
const raw = Buffer.from('{"object":"whatsapp_business_account","entry":[]}');
const hex = (secret: string, body: Buffer = raw) => createHmac('sha256', secret).update(body).digest('hex');
const check = (headers: Record<string, string>, secret: string | undefined = SECRET) =>
  verifyKapsoSignature({ rawBody: raw, headers, secret });

describe('verifyKapsoSignature', () => {
  it('accepts Kapso\'s hex header and the raw-Meta «sha256=» form, both with the Kapso secret', () => {
    expect(check({ 'x-webhook-signature': hex(SECRET) })).toBe(true);
    expect(check({ 'x-webhook-signature': hex(SECRET).toUpperCase() })).toBe(true);
    expect(check({ 'x-hub-signature-256': `sha256=${hex(SECRET)}` })).toBe(true);
    expect(check({ 'x-webhook-signature': 'nonsense', 'x-hub-signature-256': `sha256=${hex(SECRET)}` })).toBe(true);
  });

  it('refuses the wrong forms: a prefix on the Kapso header, a bare hex on the hub header', () => {
    expect(check({ 'x-webhook-signature': `sha256=${hex(SECRET)}` })).toBe(false);
    expect(check({ 'x-hub-signature-256': hex(SECRET) })).toBe(false);
  });

  it('refuses a wrong secret, a Meta app secret, a changed body and no signature at all', () => {
    expect(check({ 'x-webhook-signature': hex('another-secret') })).toBe(false);
    expect(check({ 'x-hub-signature-256': `sha256=${hex(META_SECRET)}` })).toBe(false);
    const changed = verifyKapsoSignature({ rawBody: Buffer.from(`${raw.toString()} `), headers: { 'x-webhook-signature': hex(SECRET) }, secret: SECRET });
    expect(changed).toBe(false);
    expect(check({})).toBe(false);
  });

  it('fails closed without a secret or a raw body', () => {
    expect(check({ 'x-webhook-signature': hex('') }, undefined)).toBe(false);
    expect(check({ 'x-webhook-signature': hex('  ') }, '  ')).toBe(false);
    expect(verifyKapsoSignature({ rawBody: undefined, headers: { 'x-webhook-signature': hex(SECRET) }, secret: SECRET })).toBe(false);
  });

  it('the Meta check never accepts the Kapso secret (separate routes, separate secrets)', () => {
    expect(verifySignature({ rawBody: raw, header: `sha256=${hex(SECRET)}`, secrets: [META_SECRET] })).toBe(false);
  });

  it('names the signature headers present, never their values', () => {
    expect(presentSignatureHeaders({ 'x-webhook-signature': 'v', 'content-type': 'application/json' })).toEqual(['x-webhook-signature']);
    expect(presentSignatureHeaders({ 'x-hub-signature-256': 'v', 'x-webhook-signature': 'w' })).toEqual([
      'x-webhook-signature',
      'x-hub-signature-256',
    ]);
    expect(presentSignatureHeaders({})).toEqual([]);
  });
});
