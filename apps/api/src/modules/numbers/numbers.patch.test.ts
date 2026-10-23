import { describe, expect, it } from 'vitest';
import { numberRow } from './numbers.fakes';
import { numberPatch } from './numbers.patch';

describe('numberPatch: a PATCH never leaves a row saying something false', () => {
  const checked = numberRow({ display_phone_e164: '+15550001111', health: { ok: true }, checked_at: '2026-10-22T08:00:00Z' });

  it('a new phone id drops the old id\'s phone, health and check time', () => {
    expect(numberPatch(checked, { phone_number_id: '1000000009' })).toEqual({
      phone_number_id: '1000000009', display_phone_e164: null, health: null, checked_at: null,
    });
  });

  it('the same phone id, or none, keeps them', () => {
    expect(numberPatch(checked, { phone_number_id: checked.phone_number_id })).toEqual({ phone_number_id: checked.phone_number_id });
    expect(numberPatch(checked, { label: 'رقم' })).toEqual({ label: 'رقم' });
  });

  it('moving a default to the other role unsets is_default (the default never moves silently)', () => {
    const def = numberRow({ purpose: 'notifications', is_default: true, enabled: true });
    expect(numberPatch(def, { purpose: 'chat' })).toEqual({ purpose: 'chat', is_default: false });
    expect(numberPatch(def, { purpose: 'notifications' })).toEqual({ purpose: 'notifications' });
  });

  it('disabling a default unsets is_default; disabling a spare changes nothing else', () => {
    expect(numberPatch(numberRow({ is_default: true, enabled: true }), { enabled: false })).toEqual({ enabled: false, is_default: false });
    expect(numberPatch(numberRow({ is_default: false, enabled: true }), { enabled: false })).toEqual({ enabled: false });
  });
});
