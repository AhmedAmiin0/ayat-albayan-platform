import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { conflictsOf, errorCode, lessonErrorText, overviewQuery, slotsQuery } from './api';

const FROM = new Date('2026-10-02T21:00:00.000Z');
const TO = new Date('2026-10-09T21:00:00.000Z');
const CONFLICT = { kind: 'teacher_busy', startsAt: '2026-10-04T14:00:00Z', endsAt: '2026-10-04T14:45:00Z' };

describe('error helpers (docs/10 §3 errors)', () => {
  it('reads the domain code of an ApiError', () => {
    expect(errorCode(new ApiError(409, { code: 'slot_taken', message: 'slot_taken' }))).toBe('slot_taken');
    expect(errorCode(new ApiError(400, { message: 'validation_failed' }))).toBeNull();
    expect(errorCode(new Error('network'))).toBeNull();
  });

  it('returns the conflicts of a 409 conflict only', () => {
    const conflict = new ApiError(409, { code: 'conflict', message: 'conflict', conflicts: [CONFLICT] });
    expect(conflictsOf(conflict)).toEqual([CONFLICT]);
    expect(conflictsOf(new ApiError(409, { code: 'invalid_transition' }))).toBeNull();
    expect(conflictsOf(new ApiError(409, { code: 'conflict' }))).toEqual([]);
  });

  it('words the known codes in Arabic and falls back to the generic error', () => {
    expect(lessonErrorText(new ApiError(409, { code: 'invalid_transition' }))).toBe(t.lessons.invalidTransition);
    expect(lessonErrorText(new ApiError(409, { code: 'slot_taken' }))).toBe(t.lessons.slotTaken);
    expect(lessonErrorText(new ApiError(409, { code: 'not_started' }))).toBe(t.lessons.notStarted);
    expect(lessonErrorText(new ApiError(400, { code: 'no_occurrences' }))).toBe(t.lessons.error.no_occurrences);
    expect(lessonErrorText(new ApiError(500, null))).toBe(t.common.error);
  });

  it('a course booking or change refusal names its code, never the generic retry (owner 2026-10-18)', () => {
    const refusals = [
      [400, 'starts_at_mismatch'],
      [400, 'starts_before_course'],
      [400, 'starts_before_subscription'],
      [400, 'no_change'],
      [409, 'course_changed'],
      [409, 'course_exists'],
    ] as const;
    for (const [status, code] of refusals) {
      expect(lessonErrorText(new ApiError(status, { code }))).toBe(t.booking.error[code]);
      expect(t.booking.error[code]).not.toBe(t.common.error);
    }
  });
});

describe('query keys', () => {
  it('overviewQuery sends the UTC window under the lessons key', () => {
    const q = overviewQuery({ from: FROM, to: TO });
    expect(q.queryKey).toEqual(['lessons', 'overview', 'from=2026-10-02T21%3A00%3A00.000Z&to=2026-10-09T21%3A00%3A00.000Z']);
  });

  it('slotsQuery joins student ids with commas and omits an empty list', () => {
    const base = { teacherId: 't1', from: FROM, to: TO, durationMin: 45 };
    expect(String(slotsQuery({ ...base, studentIds: ['a', 'b'] }).queryKey.at(-1))).toContain('studentIds=a%2Cb');
    expect(String(slotsQuery({ ...base, studentIds: [] }).queryKey.at(-1))).not.toContain('studentIds');
  });

  it('slotsQuery sends excludeCourse only when a course is moving («تغيير أيام الحلقات»)', () => {
    const base = { teacherId: 't1', from: FROM, to: TO, durationMin: 45, studentIds: ['a'] };
    expect(String(slotsQuery({ ...base, excludeCourse: 'sub-1' }).queryKey.at(-1))).toContain('excludeCourse=sub-1');
    expect(String(slotsQuery(base).queryKey.at(-1))).not.toContain('excludeCourse');
  });
});
