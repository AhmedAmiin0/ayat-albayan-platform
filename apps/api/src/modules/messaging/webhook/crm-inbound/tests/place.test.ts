import { describe, expect, it } from 'vitest';
import type { OverlayNumber } from '@/common/configuration/integrations/numbers-overlay';
import { loadEnv } from '@/config/env/env';
import { CRM_ENV } from '@/modules/messaging/whatsapp/drivers/crm/crm.fakes';
import { inboundPlace } from '@/modules/messaging/webhook/crm-inbound/crm-inbound.place';

// CRM inbound lands on the notifications line, or the crm notifications number in module mode.

const CRM = {
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_SERVICE_ROLE_KEY: 'k',
  WA_PROVIDER: 'crm',
  WACRM_API_BASE: CRM_ENV.base,
  WACRM_API_KEY: CRM_ENV.apiKey,
};
const CHAT = {
  WA_CHAT_PROVIDER: 'kapso',
  WA_CHAT_PHONE_NUMBER_ID: 'c-phone',
  WA_CHAT_WABA_ID: 'c-waba',
  WA_API_BASE: 'http://wa-stub.test',
  KAPSO_API_BASE: 'http://wa-stub.test/kapso',
  KAPSO_API_KEY: 'kapso-key-fake',
};
const number = (over: Partial<OverlayNumber>) =>
  ({ id: 'n', purpose: 'notifications', is_default: false, env: CRM_ENV, ...over }) as OverlayNumber;

describe('inboundPlace', () => {
  it('legacy with a chat line: stamped notifications, no number', () => {
    expect(inboundPlace(loadEnv({ ...CRM, ...CHAT }), null)).toEqual({
      line: 'notifications',
      numberId: null,
    });
  });

  it('legacy single line: unstamped, as any single-line inbound', () => {
    expect(inboundPlace(loadEnv(CRM), null)).toEqual({ line: null, numberId: null });
  });

  it('module mode: the default crm notifications number (never a chat or meta one)', () => {
    const numbers = [
      number({ id: 'chat-crm', purpose: 'chat', is_default: true }),
      number({ id: 'notif-meta', env: null, is_default: true }),
      number({ id: 'notif-crm-2' }),
      number({ id: 'notif-crm', is_default: true }),
    ];
    expect(inboundPlace(loadEnv(CRM), numbers)).toEqual({
      line: 'notifications',
      numberId: 'notif-crm',
    });
    expect(inboundPlace(loadEnv(CRM), numbers.slice(0, 3))).toMatchObject({ numberId: 'notif-crm-2' });
    expect(inboundPlace(loadEnv(CRM), [])).toEqual({ line: 'notifications', numberId: null });
  });
});
