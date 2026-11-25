import { describe, expect, it } from 'vitest';
import { connectionId, driverOf } from '@/modules/messaging/whatsapp/drivers/driver-record';
import { CRM_ENV } from '@/modules/messaging/whatsapp/drivers/crm/crm.fakes';
import { EVO_BAILEYS } from '@/modules/messaging/whatsapp/drivers/evolution/evolution.fakes';

const META = {
  base: 'http://x',
  version: 'v21.0',
  phoneNumberId: 'p',
  wabaId: 'w',
  accessToken: 't',
};
const KAPSO = { ...META, provider: 'kapso' as const, apiKey: 'k' };

describe('driverOf', () => {
  it.each([
    ['meta', { paymentHold: true, fetchesMedia: true, fixedConn: null }],
    ['kapso', { paymentHold: true, fetchesMedia: true, fixedConn: null }],
    ['crm', { paymentHold: false, fetchesMedia: false, fixedConn: 'crm' }],
    ['evolution', { paymentHold: true, fetchesMedia: true, fixedConn: null }],
  ])('%s', (provider, traits) => {
    expect(driverOf(provider)).toEqual(traits);
  });

  it("no provider or an unknown one keeps Meta's traits", () => {
    expect([undefined, null, 'other'].map(driverOf)).toEqual([0, 1, 2].map(() => driverOf('meta')));
  });
});

describe('connectionId', () => {
  it('the driver with its WABA and number id, the instance, or the crm', () => {
    expect([META, KAPSO, CRM_ENV, EVO_BAILEYS].map(connectionId)).toEqual([
      'meta:w:p',
      'kapso:w:p',
      'crm',
      `evolution:${EVO_BAILEYS.instance}`,
    ]);
  });
});
