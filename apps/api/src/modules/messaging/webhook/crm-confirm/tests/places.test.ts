import { describe, expect, it } from 'vitest';
import type { OverlayNumber } from '@/common/configuration/integrations/numbers-overlay';
import { loadEnv } from '@/config/env/env';
import { CRM_ENV } from '@/modules/messaging/whatsapp/drivers/crm/crm.fakes';
import { crmPlaces, sentViaCrm } from '@/modules/messaging/webhook/crm-confirm/crm-places';

// docs/19 «Confirming an uncertain send»: only a row that left through the CRM is ever confirmed.

const BASE = { SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_SERVICE_ROLE_KEY: 'k' };
const CRM = {
  ...BASE,
  WA_PROVIDER: 'crm',
  WACRM_API_BASE: CRM_ENV.base,
  WACRM_API_KEY: CRM_ENV.apiKey,
};
const number = (id: string, env: OverlayNumber['env']) => ({ id, env }) as OverlayNumber;

describe('crmPlaces / sentViaCrm', () => {
  it('legacy: the notifications line on crm; the chat line on meta is not', () => {
    const places = crmPlaces(loadEnv({ ...CRM }), null);
    expect(places.env).toEqual(CRM_ENV);
    const via = sentViaCrm(places);
    expect(via({ line: 'notifications', number_id: null })).toBe(true);
    expect(via({ line: 'chat', number_id: null })).toBe(false);
  });

  it('module mode: a known number by its own driver, never its line', () => {
    const numbers = [number('n-crm', CRM_ENV), number('n-meta', null)];
    const via = sentViaCrm(crmPlaces(loadEnv(BASE), numbers));
    expect(via({ line: 'chat', number_id: 'n-crm' })).toBe(true);
    expect(via({ line: 'notifications', number_id: 'n-meta' })).toBe(false);
  });

  it('nothing on crm: no env, nothing confirmed', () => {
    const places = crmPlaces(loadEnv(BASE), []);
    expect(places.env).toBeNull();
    expect(sentViaCrm(places)({ line: 'notifications', number_id: null })).toBe(false);
  });
});
