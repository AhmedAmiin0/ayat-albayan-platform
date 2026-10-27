import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { lengthText, lockedText, payoutLock, whenWithLength } from './edit-time-text';
import { locale } from '@/lib/i18n/locale';

/** The cycle the suite reads times in (test-setup saves 24 h). */
const C24 = { cycle: '24', locale } as const;

describe('edit-time wording (R-SCH-11)', () => {
  it('a named length reads as usual, an odd migrated one keeps its unit', () => {
    expect(lengthText(45)).toBe(t.enums.duration['45']);
    expect(lengthText(40)).toBe(t.lessons.timeEdit.durationOther.replace('{n}', '40'));
    expect(whenWithLength('2026-10-06T13:00:00.000Z', 40, C24)).toContain(lengthText(40));
  });

  it('names the locked month and its status from the 409 body', () => {
    const lock = payoutLock(new ApiError(409, { code: 'payout_locked', month: '2026-09', status: 'approved' }));
    expect(lock).toEqual({ month: '2026-09', status: 'approved' });
    const text = lockedText({ month: '2026-09', status: 'approved' });
    expect(text).toContain('2026');
    expect(text).toContain(t.enums.payoutStatus.approved);
    expect(payoutLock(new Error('x'))).toBeNull();
  });
});
