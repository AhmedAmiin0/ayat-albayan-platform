import { describe, expect, it } from 'vitest';
import { CrmWhatsappClient } from './crm.client';
import { CRM_ENV, CRM_SENT } from './crm.fakes';
import { scriptedFetch } from '@/modules/messaging/whatsapp/whatsapp.fakes';

// sendBody (the script relay): a body already in the CRM's shape, through the same send path.

const TO = '+966500000001';

describe('CrmWhatsappClient.sendBody', () => {
  it('posts the body as given, with its contact name; the wamid back', async () => {
    const f = scriptedFetch(CRM_SENT);
    const client = new CrmWhatsappClient(CRM_ENV, { fetch: f.fetch, timeoutMs: 1_000 });
    const body = { to: TO, type: 'text' as const, text: 'نص', name: 'م' };
    await expect(client.sendBody(body)).resolves.toEqual({ waMessageId: 'wamid.crm-1' });
    expect(f.requests[0]?.body).toEqual(body);
  });

  it('keeps the allow-list: refused before any request', async () => {
    const f = scriptedFetch();
    const client = new CrmWhatsappClient(CRM_ENV, { fetch: f.fetch, allowed: ['+966500000009'] });
    await expect(client.sendBody({ to: TO, type: 'text', text: 'x' })).rejects.toThrow(
      'recipient not allowed',
    );
    expect(f.requests).toEqual([]);
  });
});
