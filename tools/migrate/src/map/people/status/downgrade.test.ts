// The old rule's grounds, reported per reason when the new status is not active (counts only).
import { describe, expect, it } from 'vitest';
import { downgradeIssue, oldActiveReason } from './downgrade.ts';

const none = { claims: [], payingPhone: false, chargeable: false, subsRegister: false } as const;
const ref = { source: 'HUB' as const, tab: 'الطلاب', row: 4 };

describe('oldActiveReason', () => {
  it('names the first ground, in the reported order', () => {
    expect(oldActiveReason({ ...none, claims: ['heart_row', 'hub_current'] })).toBe(
      'hub_current_student',
    );
    expect(oldActiveReason({ ...none, claims: ['subscribed_booking'], chargeable: true })).toBe(
      'subscribed_booking_not_running',
    );
    expect(oldActiveReason({ ...none, payingPhone: true })).toBe('heart_payment_not_current');
    expect(oldActiveReason({ ...none, claims: ['heart_row'] })).toBe('heart_payment_not_current');
    expect(oldActiveReason({ ...none, chargeable: true, subsRegister: true })).toBe(
      'reported_lessons_only',
    );
    expect(oldActiveReason({ ...none, subsRegister: true })).toBe('subs_register_only');
    expect(oldActiveReason(none)).toBeNull();
  });
});

describe('downgradeIssue', () => {
  it('a warn with reason→status and no personal data', () => {
    const grounds = { ...none, claims: ['hub_current'] as const };
    expect(downgradeIssue(ref, { grounds, status: 'expired' })).toEqual({
      entity: 'students',
      ref,
      code: 'status_downgrade',
      severity: 'warn',
      field: 'status',
      detail: 'hub_current_student→expired',
    });
  });

  it('none when still active, or when the old rule did not say active', () => {
    const grounds = { ...none, chargeable: true };
    expect(downgradeIssue(ref, { grounds, status: 'active' })).toBeNull();
    expect(downgradeIssue(ref, { grounds: none, status: 'new' })).toBeNull();
  });
});
