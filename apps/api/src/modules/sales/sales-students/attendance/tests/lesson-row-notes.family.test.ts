import { COURSE_PAUSE_REASON } from '@ab/shared';
import { AUTO_NO_SHOW_REASON } from '@ab/schedule';
import { describe, expect, it } from 'vitest';
import { familyReason } from '@/modules/sales/sales-students/attendance/lesson-row-notes';

const AT = '2026-11-01T22:30:00Z';
const lesson = (status: 'excused' | 'cancelled_by_admin' | 'no_show', over = {}) => ({
  status,
  cancel_reason: 'سفر العائلة',
  starts_at: AT,
  rule: null,
  ...over,
});
const ended = (ends_on: string) => ({ package: '8' as const, ends_on, tz: 'Asia/Riyadh' });

describe('familyReason (docs/50 §5: the family\'s own excuse only)', () => {
  it('an excused lesson keeps its reason', () => {
    expect(familyReason(lesson('excused'))).toBe('سفر العائلة');
  });

  it('never another status, even with a reason', () => {
    expect(familyReason(lesson('cancelled_by_admin'))).toBeNull();
    expect(familyReason(lesson('no_show'))).toBeNull();
  });

  it('never the pause, the job\'s no-show or a series-end text', () => {
    expect(familyReason(lesson('excused', { cancel_reason: COURSE_PAUSE_REASON }))).toBeNull();
    expect(familyReason(lesson('excused', { cancel_reason: AUTO_NO_SHOW_REASON }))).toBeNull();
    expect(familyReason(lesson('excused', { rule: ended('2026-10-30') }))).toBeNull();
    expect(familyReason(lesson('excused', { rule: ended('2026-11-03') }))).toBe('سفر العائلة');
  });

  it('no reason recorded: null', () => {
    expect(familyReason(lesson('excused', { cancel_reason: null }))).toBeNull();
  });
});
