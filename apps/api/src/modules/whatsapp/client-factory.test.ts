import { describe, expect, it } from 'vitest';
import { whatsappClient } from './client-factory';
import { CrmWhatsappClient } from './crm.client';
import { CRM_ENV } from './crm.fakes';
import { KAPSO_ENV } from './kapso.fakes';
import { HttpWhatsappClient } from './whatsapp.client';
import { STUB_ENV } from './whatsapp.fakes';

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
