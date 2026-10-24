import { describe, expect, it } from 'vitest';
import { integrationValuesSchema, integrationValueValid } from './checks.js';
import { INTEGRATION_ENUMS, integrationDef, integrationEnum, WA_PROVIDERS } from './keys.js';

// The WhatsApp driver choice (docs/19): one provider key per line, the Kapso group, the enum select.

describe('WhatsApp driver keys', () => {
  it('each line has its own provider key in its own group; the Kapso keys have their group', () => {
    expect(integrationDef('WA_PROVIDER')).toMatchObject({ group: 'wa_notifications', secret: false });
    expect(integrationDef('WA_CHAT_PROVIDER')).toMatchObject({ group: 'wa_chat', secret: false });
    expect(integrationDef('KAPSO_API_BASE')).toMatchObject({ group: 'kapso', secret: false });
    expect(integrationDef('KAPSO_API_VERSION')).toMatchObject({ group: 'kapso', secret: false });
    expect(integrationDef('KAPSO_API_KEY')).toMatchObject({ group: 'kapso', secret: true });
    expect(integrationDef('KAPSO_WEBHOOK_SECRET')).toMatchObject({ group: 'kapso', secret: true });
    expect(integrationDef('WACRM_API_BASE')).toMatchObject({ group: 'wacrm', secret: false });
    expect(integrationDef('WACRM_API_KEY')).toMatchObject({ group: 'wacrm', secret: true });
    expect(integrationDef('WACRM_WEBHOOK_SECRET')).toMatchObject({ group: 'wacrm', secret: true });
  });

  it('the provider keys are enums valued meta | kapso | crm; the template sync is a true | false switch', () => {
    expect(WA_PROVIDERS).toEqual(['meta', 'kapso', 'crm']);
    expect(Object.keys(INTEGRATION_ENUMS).sort()).toEqual(['WA_CHAT_PROVIDER', 'WA_PROVIDER', 'WA_TEMPLATE_SYNC']);
    expect(integrationEnum('WA_TEMPLATE_SYNC')).toEqual(['true', 'false']);
    expect(integrationEnum('WA_PROVIDER')).toEqual(['meta', 'kapso', 'crm']);
    expect(integrationEnum('WA_API_BASE')).toBeNull();
    expect(integrationEnum('KAPSO_API_KEY')).toBeNull();
  });

  it('the server refuses a provider outside the enum and a bad Kapso base or version', () => {
    expect(integrationValueValid('WA_PROVIDER', 'kapso')).toBe(true);
    expect(integrationValueValid('WA_CHAT_PROVIDER', 'meta')).toBe(true);
    expect(integrationValueValid('WA_PROVIDER', 'twilio')).toBe(false);
    expect(integrationValueValid('WA_PROVIDER', 'Kapso')).toBe(false);
    expect(integrationValueValid('KAPSO_API_BASE', 'https://kapso.example.test/meta/whatsapp')).toBe(true);
    expect(integrationValueValid('KAPSO_API_BASE', 'kapso')).toBe(false);
    expect(integrationValueValid('KAPSO_API_VERSION', 'v24.0')).toBe(true);
    expect(integrationValueValid('KAPSO_API_VERSION', '24')).toBe(false);
    expect(integrationValueValid('WA_PROVIDER', 'crm')).toBe(true);
    expect(integrationValueValid('WACRM_API_BASE', 'https://crm.example.test/api/v1')).toBe(true);
    expect(integrationValueValid('WACRM_API_BASE', 'crm')).toBe(false);
    const bad = integrationValuesSchema.safeParse({ values: { WA_PROVIDER: 'other' } });
    expect(bad.error?.issues.map((i) => i.path.join('.'))).toEqual(['values.WA_PROVIDER']);
  });
});
