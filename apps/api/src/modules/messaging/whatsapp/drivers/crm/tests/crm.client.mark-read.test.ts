import { describe, expect, it } from 'vitest';
import { CrmWhatsappClient } from '@/modules/messaging/whatsapp/drivers/crm/crm.client';
import { CRM_ENV } from '@/modules/messaging/whatsapp/drivers/crm/crm.fakes';
import { scriptedFetch } from '@/modules/messaging/whatsapp/whatsapp.fakes';

describe('CrmWhatsappClient.markRead', () => {
  it('configured: resolves without a request (the CRM owns its read receipts)', async () => {
    const f = scriptedFetch();
    const client = new CrmWhatsappClient(CRM_ENV, { fetch: f.fetch });
    await expect(client.markRead()).resolves.toBeUndefined();
    expect(f.requests).toHaveLength(0);
  });

  it('not configured: a rejected promise (never a synchronous throw) with code null, status 0', async () => {
    let call: Promise<void> | undefined;
    expect(() => {
      call = new CrmWhatsappClient(null).markRead();
    }).not.toThrow();
    await expect(call).rejects.toMatchObject({ info: { code: null, status: 0 } });
  });
});
