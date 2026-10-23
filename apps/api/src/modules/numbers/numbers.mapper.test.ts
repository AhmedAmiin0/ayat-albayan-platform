import type { LineCheckView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { numberRow } from './numbers.fakes';
import { healthFromCheck, healthJson, healthOf, numberView } from './numbers.mapper';

const check = (over: Partial<LineCheckView> = {}): LineCheckView => ({
  line: 'notifications', configured: true, provider: 'meta', gaps: [], duplicate_chat_phone: false,
  phone_number_id: '1000000001', waba_id: '2000000001', app_id: null, display_phone_number: '+1 555-000-1111',
  verified_name: 'Academy', quality_rating: 'GREEN', status: 'CONNECTED', name_status: null, code_verification_status: null,
  subscribed_apps: [], errors: [], checked_at: '2026-10-23T08:00:00.000Z', ...over,
});

describe('numbers mapper', () => {
  it('a row → its view: secrets as set / not set only', () => {
    const row = numberRow();
    const view = numberView(row, new Map([[row.id, { access_token: '2026-10-23T09:00:00Z' }]]));
    expect(view.secrets).toEqual({ access_token: { set: true, updated_at: '2026-10-23T09:00:00Z' }, app_secret: { set: false, updated_at: null } });
    expect(view).toMatchObject({ provider: 'meta', purpose: 'notifications', health: null });
  });

  it('an unknown provider reads as meta; malformed health reads as null', () => {
    expect(numberView(numberRow({ provider: 'x' }), new Map()).provider).toBe('meta');
    expect(healthOf('oops')).toBeNull();
    expect(healthOf({ ok: true, gaps: [1, 'WA_WABA_ID'] })).toMatchObject({ ok: true, gaps: ['WA_WABA_ID'], errors: 0 });
  });

  it('a good check keeps the display number; a failed one keeps only the health', () => {
    expect(healthFromCheck(check())).toMatchObject({ display_phone_e164: '+15550001111', health: { ok: true, status: 'CONNECTED' } });
    const failed = healthFromCheck(check({ display_phone_number: null, errors: [{ step: 'phone', code: 190, message: 'expired' }] }));
    expect(failed).not.toHaveProperty('display_phone_e164');
    expect(failed.health).toMatchObject({ ok: false, errors: 1 });
    expect(healthOf(healthJson(failed.health))).toEqual(failed.health);
  });
});
