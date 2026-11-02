import { describe, expect, it } from 'vitest';
import { receiverUrl } from './crm-webhooks.client';

// docs/19 «crm driver»: where the CRM delivers the ticks, from API_PUBLIC_URL. Built with URL.

describe('receiverUrl', () => {
  it('<origin>/webhooks/wacrm, with or without a trailing slash', () => {
    const want = 'https://api.test.example/webhooks/wacrm';
    expect(receiverUrl('https://api.test.example')).toBe(want);
    expect(receiverUrl(' https://api.test.example/ ')).toBe(want);
  });

  it('null for an origin with a path (the receiver would not be where the CRM is told)', () => {
    expect(receiverUrl('https://api.test.example/v1')).toBeNull();
    expect(receiverUrl('https://api.test.example/v1/')).toBeNull();
  });

  it('null unless https on a domain (the CRM refuses http and private targets)', () => {
    for (const raw of [undefined, '', 'http://api.test.example', 'javascript:alert(1)']) {
      expect(receiverUrl(raw)).toBeNull();
    }
    expect(receiverUrl('https://127.0.0.1:3000')).toBeNull();
  });
});
