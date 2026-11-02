import { afterEach, describe, expect, it } from 'vitest';
import { setNumbersOverlay, type OverlayNumber } from '@/common/configuration/integrations/numbers-overlay';
import { loadEnv } from '@/config/env/env';
import { STUB_ENV } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { holdKey } from './hold-key';

// The line hold's key carries the current driver and ids: a live switch starts unheld (§3.3).

const BASE = { SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_SERVICE_ROLE_KEY: 'k' };
const WA = {
  WA_API_BASE: 'http://localhost:4010',
  WA_PHONE_NUMBER_ID: 'n-phone',
  WA_WABA_ID: 'n-waba',
  WA_ACCESS_TOKEN: 'meta-token',
};
const KAPSO = { KAPSO_API_BASE: 'http://localhost:4010/kapso', KAPSO_API_KEY: 'fake-kapso-key' };
const CRM = { WACRM_API_BASE: 'http://localhost:4010/crm', WACRM_API_KEY: 'fake-crm-key' };
const env = (over: Record<string, string> = {}) => loadEnv({ ...BASE, ...WA, ...over });
const notifications = { line: 'notifications' as const };

afterEach(() => setNumbersOverlay(null));

describe('holdKey', () => {
  it('legacy: the line with its driver, WABA and number id', () => {
    expect(holdKey(notifications, env())).toBe('line:notifications:meta:n-waba:n-phone');
  });

  it('a driver switch or another WABA / number is another key (the old hold no longer applies)', () => {
    const meta = holdKey(notifications, env());
    expect(holdKey(notifications, env({ ...KAPSO, WA_PROVIDER: 'kapso' }))).toBe(
      'line:notifications:kapso:n-waba:n-phone',
    );
    expect(holdKey(notifications, env({ WA_WABA_ID: 'other-waba' }))).not.toBe(meta);
    expect(holdKey(notifications, env({ WA_PHONE_NUMBER_ID: 'other' }))).not.toBe(meta);
  });

  it('a line on crm is never line-held (its errors carry no Meta 131042)', () => {
    expect(holdKey(notifications, env({ ...CRM, WA_PROVIDER: 'crm' }))).toBeNull();
    expect(holdKey(notifications, env({ WA_PROVIDER: 'crm' }))).toBeNull();
  });

  it('an unconfigured line keeps the bare line key', () => {
    expect(holdKey({ line: 'chat' }, env())).toBe('line:chat');
  });

  it('module mode: the number with its own driver and ids; crm = none', () => {
    const number = (id: string, numberEnv: OverlayNumber['env']) =>
      ({ id, env: numberEnv }) as unknown as OverlayNumber;
    const crm = { provider: 'crm' as const, base: 'http://crm', apiKey: 'k' };
    setNumbersOverlay({ values: {}, numberIds: {}, numbers: [number('n-1', STUB_ENV), number('n-2', crm)] });
    const route = (numberId: string) => ({ line: 'chat' as const, route: { numberId, line: 'chat' as const } });
    expect(holdKey(route('n-1'), env())).toBe('number:n-1:meta:stub-waba:stub-phone');
    expect(holdKey(route('n-2'), env())).toBeNull();
    expect(holdKey(route('n-9'), env())).toBe('number:n-9');
  });
});
