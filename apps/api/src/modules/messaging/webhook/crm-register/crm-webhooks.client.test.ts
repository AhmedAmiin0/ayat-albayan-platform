import { describe, expect, it } from 'vitest';
import { receiverUrl } from './crm-webhooks.client';

// docs/19 «crm driver»: where the CRM delivers the ticks, from API_PUBLIC_URL. Built with URL.

describe('receiverUrl', () => {
  it('<origin>/webhooks/wacrm, whatever path or trailing slash the origin carries', () => {
    const want = 'https://api.test.example/webhooks/wacrm';
    expect(receiverUrl('https://api.test.example')).toBe(want);
    expect(receiverUrl(' https://api.test.example/ ')).toBe(want);
    expect(receiverUrl('https://api.test.example/v1?x=1#y')).toBe(want);
  });

  it('null unless https on a domain (the CRM refuses http and private targets)', () => {
    for (const raw of [undefined, '', 'http://api.test.example', 'javascript:alert(1)']) {
      expect(receiverUrl(raw)).toBeNull();
    }
    expect(receiverUrl('https://127.0.0.1:3000')).toBeNull();
  });
});
