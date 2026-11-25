import { describe, expect, it } from 'vitest';
import { whatsappClient } from '@/modules/messaging/whatsapp/client-factory';
import { CrmWhatsappClient } from '@/modules/messaging/whatsapp/drivers/crm/crm.client';
import { CRM_ENV } from '@/modules/messaging/whatsapp/drivers/crm/crm.fakes';
import { KAPSO_ENV } from '@/modules/messaging/whatsapp/drivers/kapso/kapso.fakes';
import { HttpWhatsappClient } from '@/modules/messaging/whatsapp/whatsapp.client';
import { STUB_ENV } from '@/modules/messaging/whatsapp/whatsapp.fakes';

// docs/19: ONE factory picks a line's client by its driver.

describe('whatsappClient', () => {
  it('crm → CrmWhatsappClient; meta and kapso → the Graph client; null → a client that refuses', () => {
    expect(whatsappClient(CRM_ENV)).toBeInstanceOf(CrmWhatsappClient);
    expect(whatsappClient(STUB_ENV)).toBeInstanceOf(HttpWhatsappClient);
    expect(whatsappClient(KAPSO_ENV)).toBeInstanceOf(HttpWhatsappClient);
    expect(whatsappClient(null).configured()).toBe(false);
    expect(whatsappClient(CRM_ENV).configured()).toBe(true);
  });
});
