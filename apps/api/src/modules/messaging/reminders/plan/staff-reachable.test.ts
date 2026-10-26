import { describe, expect, it } from 'vitest';
import { isStaffAlert, staffReachable, staffStale, staffTeacherId } from './staff-reachable';

describe('staffReachable (staff WhatsApp alerts, owner 2026-10-25)', () => {
  it('an active teacher, with or without a login, is reachable', () => {
    expect(staffReachable({ status: 'active', profile: { disabled_at: null } })).toBe(true);
    expect(staffReachable({ status: 'active', profile: null })).toBe(true);
    expect(staffReachable({})).toBe(true);
  });

  it('an inactive teacher or a disabled login is not', () => {
    expect(staffReachable({ status: 'inactive', profile: null })).toBe(false);
    expect(staffReachable({ status: 'active', profile: { disabled_at: '2026-10-25T00:00:00Z' } })).toBe(false);
  });
});

describe('staff alerts at send time (send-stale)', () => {
  const T = 'a0000000-0000-4000-8000-000000000001';
  const on = { status: 'active', phone_e164: '+966500000001', profile: null } as const;

  it('the three teacher templates only; guardians, families and leads are not staff alerts', () => {
    for (const k of ['teacher_new_student', 'teacher_lesson_reminder', 'teacher_lesson_reminder_meet']) expect(isStaffAlert(k)).toBe(true);
    for (const k of ['lesson_reminder', 'booking_confirmation', 'follow_up_slots', null]) expect(isStaffAlert(k)).toBe(false);
  });

  it('staffTeacherId: the uuid after «<key>:<lesson>:», else null', () => {
    expect(staffTeacherId(`teacher_new_student:l1:${T}`)).toBe(T);
    expect(staffTeacherId('teacher_new_student:l1')).toBeNull();
    expect(staffTeacherId('teacher_new_student:l1:not-a-uuid')).toBeNull();
    expect(staffTeacherId(null)).toBeNull();
  });

  it('staffStale: gone, inactive / disabled, or another number now → a reason; else null', () => {
    expect(staffStale([], on.phone_e164)).toBe('teacher not on record');
    expect(staffStale([{ ...on, status: 'inactive' }], on.phone_e164)).toBe('teacher inactive or login disabled');
    expect(staffStale([{ ...on, profile: { disabled_at: '2026-10-25T00:00:00Z' } }], on.phone_e164)).toBe('teacher inactive or login disabled');
    expect(staffStale([on], '+966500000009')).toBe('teacher number changed');
    expect(staffStale([on], on.phone_e164)).toBeNull();
  });
});
