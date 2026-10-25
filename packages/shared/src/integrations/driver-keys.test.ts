import { describe, expect, it } from 'vitest';
import { driverKeys, driverMissing } from './driver-keys.js';

describe('driverKeys / driverMissing (docs/19: readiness before a driver switch)', () => {
  it('crm needs only the CRM base and key, on either line', () => {
    expect(driverKeys('crm', 'notifications')).toEqual(['WACRM_API_BASE', 'WACRM_API_KEY']);
    expect(driverKeys('crm', 'chat')).toEqual(['WACRM_API_BASE', 'WACRM_API_KEY']);
  });

  it('kapso and meta need the line\'s own ids', () => {
    expect(driverKeys('kapso', 'chat')).toEqual(['WA_CHAT_PHONE_NUMBER_ID', 'WA_CHAT_WABA_ID', 'KAPSO_API_BASE', 'KAPSO_API_KEY']);
    expect(driverKeys('meta', 'notifications')).toEqual(['WA_API_BASE', 'WA_PHONE_NUMBER_ID', 'WA_WABA_ID', 'WA_ACCESS_TOKEN']);
    expect(driverKeys('meta', 'chat')).toContain('WA_CHAT_ACCESS_TOKEN');
  });

  it('names what is unset, by key name only', () => {
    const items = [
      { key: 'WACRM_API_BASE' as const, set: true },
      { key: 'WACRM_API_KEY' as const, set: false },
    ];
    expect(driverMissing({ provider: 'crm', line: 'notifications', items })).toEqual(['WACRM_API_KEY']);
    expect(driverMissing({ provider: 'crm', line: 'notifications', items: items.map((i) => ({ ...i, set: true })) })).toEqual([]);
  });
});
