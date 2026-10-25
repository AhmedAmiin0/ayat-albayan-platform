import { describe, expect, it } from 'vitest';
import { IDS } from './booking.fakes';
import { ACTOR, OLD, trialRow } from './trial-date.fakes';
import { trialHistory, trialLessonsOf } from './trial-date.history';

const NOW = new Date('2026-10-01T08:00:00Z');
const STUDENT = { id: IDS.s1, status: 'trial' as const, tz: 'Asia/Riyadh', guardian: { tz: 'Europe/London' } };
const NEW = 'cccccccc-0000-4000-8000-000000000001';

/** The first date (moved), the date that replaced it (upcoming), an older attended and an absent one. */
const ROWS = [
  trialRow({ status: 'rescheduled', created_at: '2026-09-20T09:00:00+00:00' }),
  trialRow({ id: NEW, rescheduled_from_id: OLD, starts_at: '2026-10-06T15:00:00+00:00', ends_at: '2026-10-06T15:30:00+00:00', created_at: '2026-09-29T09:00:00+00:00', created_by: null }),
  trialRow({ id: 'att', status: 'completed', starts_at: '2026-09-10T15:00:00+00:00', created_at: '2026-09-01T09:00:00+00:00' }),
  trialRow({ id: 'abs', status: 'completed', attendance: 'absent', created_at: '2026-08-01T09:00:00+00:00' }),
];

describe('«مواعيد الحلقة التجريبية»: every trial time picked for the student', () => {
  it('newest pick first, each lesson once (the two reads may overlap), only trial lessons', () => {
    const course = trialRow({ id: 'course', rule: { package: '8' }, created_at: '2026-09-30T09:00:00+00:00' });
    const ids = trialLessonsOf([...ROWS, ROWS[0] ?? trialRow(), course]).map((l) => l.id);
    expect(ids).toEqual([NEW, OLD, 'att', 'abs']);
  });

  it('rows: outcome, teacher, who picked it and when, which date it replaced', () => {
    const h = trialHistory({ student: STUDENT, lessons: trialLessonsOf(ROWS), names: new Map([[ACTOR, 'سارة']]), now: NOW });
    expect(h.items.map((r) => [r.lesson_id, r.outcome])).toEqual([[NEW, 'upcoming'], [OLD, 'moved'], ['att', 'attended'], ['abs', 'absent']]);
    expect(h.items[0]).toEqual({
      lesson_id: NEW,
      starts_at: '2026-10-06T15:00:00.000Z',
      ends_at: '2026-10-06T15:30:00.000Z',
      teacher: { id: IDS.teacher, name: 'أبرار' },
      outcome: 'upcoming',
      picked_by: null,
      picked_at: '2026-09-29T09:00:00.000Z',
      moved_from_id: OLD,
    });
    expect(h.items[1]?.picked_by).toBe('سارة');
  });

  it('header facts: the count, the family’s zone, allowed, and the upcoming trial a new date moves', () => {
    const h = trialHistory({ student: STUDENT, lessons: trialLessonsOf(ROWS), names: new Map(), now: NOW });
    expect({ count: h.count, tz: h.family_tz, allowed: h.allowed, upcoming: h.upcoming_id }).toEqual({ count: 4, tz: 'Europe/London', allowed: true, upcoming: NEW });
  });

  it('a subscriber is not allowed; no guardian falls back to the student’s zone; empty when none', () => {
    const h = trialHistory({ student: { ...STUDENT, status: 'active', guardian: null }, lessons: [], names: new Map(), now: NOW });
    expect({ allowed: h.allowed, tz: h.family_tz, count: h.count, upcoming: h.upcoming_id }).toEqual({ allowed: false, tz: 'Asia/Riyadh', count: 0, upcoming: null });
  });
});
