import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { monthLabel } from '@/teacher/lib/payout-text';
import { lengthLocked, lockedText, payoutLockOf } from './edit-time-lock';
import { lengthText } from './edit-time-text';
import { held, upcoming } from '../testing/fixtures';

const state = (durationMin: number) => ({ picked: null, durationMin, reason: '', notify: true });

describe('payoutLockOf', () => {
  test('reads the month and status of a payout_locked answer', () => {
    const error = new ApiError(409, { code: 'payout_locked', month: '2026-09', status: 'paid' });
    expect(payoutLockOf(error)).toEqual({ month: '2026-09', status: 'paid' });
  });

  test('an answer without them still locks; any other error does not', () => {
    expect(payoutLockOf(new ApiError(409, { code: 'payout_locked' }))).toEqual({ month: null, status: null });
    expect(payoutLockOf(new ApiError(409, { code: 'stale_time' }))).toBeNull();
    expect(payoutLockOf(new TypeError('Network request failed'))).toBeNull();
  });
});

describe('lockedText', () => {
  test('names the month and the status in the UI language', () => {
    const text = lockedText({ month: '2026-09', status: 'approved' });
    expect(text).toContain(monthLabel('2026-09'));
    expect(text).toContain(t.enums.payoutStatus.approved);
  });

  test('falls back to the general line when the month or an unknown status is missing', () => {
    expect(lockedText({ month: null, status: null })).toBe(t.editTime.error.payout_locked);
    expect(lockedText({ month: '2026-09', status: 'nope' })).toBe(t.editTime.error.payout_locked);
  });
});

describe('lengthLocked', () => {
  const lock = { month: '2026-09', status: 'paid' };
  test('holds back only a changed length while the lock is on', () => {
    expect(lengthLocked(lock, held, state(60))).toBe(true);
    expect(lengthLocked(lock, held, state(45))).toBe(false);
    expect(lengthLocked(null, held, state(60))).toBe(false);
    expect(lengthLocked(lock, upcoming, state(90))).toBe(true);
  });
});

describe('lengthText', () => {
  test('a named length, else the unit-bearing fallback (a migrated 40 minutes)', () => {
    expect(lengthText(45)).toBe(t.enums.duration['45']);
    expect(lengthText(40)).toBe(t.editTime.durationOther.replace('{n}', '40'));
  });
});
