import { describe, expect, it } from 'vitest';
import { child, GUARDIAN_ID, heldLesson, LESSON_ID, NOW, OTHER_GUARDIAN_ID, PHONE } from './rating.fakes';
import { planRatings, ratingDedupKey, ratingDue, ratingFamilies, RATING_LOOKBACK_MS } from './rating.plan';

const other = { id: OTHER_GUARDIAN_ID, phone_e164: '+201001234567', tz: 'Africa/Cairo' };

describe('planRatings (migration 195)', () => {
  it('one lesson_rating per guardian, dedup key per (lesson, guardian), expires 72 h after the start', () => {
    const [row, ...rest] = planRatings({ lessons: [heldLesson()], now: NOW });
    expect(rest).toEqual([]);
    expect(row).toMatchObject({
      direction: 'outbound',
      status: 'queued',
      phone_e164: PHONE,
      guardian_id: GUARDIAN_ID,
      lesson_id: LESSON_ID,
      template_key: 'lesson_rating',
      dedup_key: `lesson_rating:${LESSON_ID}:${GUARDIAN_ID}`,
      scheduled_for: NOW.toISOString(),
      expires_at: '2026-10-07T14:00:00.000Z',
    });
    expect(row?.template_params).toMatchObject({ '1': 'سهيلة', '2': 'الأحد 4 أكتوبر' });
    expect(row?.template_params.payloads).toHaveLength(3);
  });

  it('siblings share one message; another family on the lesson gets its own', () => {
    const lesson = heldLesson({
      lesson_students: [child('سهيلة'), child('مريم'), child('يوسف', { student: { id: 's-y', name: 'يوسف', guardian: other } })],
    });
    const rows = planRatings({ lessons: [lesson], now: NOW });
    expect(rows.map((r) => [r.dedup_key, r.template_params['1']])).toEqual([
      [ratingDedupKey(LESSON_ID, GUARDIAN_ID), 'سهيلة ومريم'],
      [ratingDedupKey(LESSON_ID, OTHER_GUARDIAN_ID), 'يوسف'],
    ]);
  });

  it('only children who attended: an absent or excused sibling is left out, a family with none gets nothing', () => {
    const lesson = heldLesson({ lesson_students: [child('سهيلة', { attendance: 'absent' }), child('مريم', { attendance: 'excused' })] });
    expect(ratingFamilies(lesson)).toEqual([]);
    expect(planRatings({ lessons: [lesson], now: NOW })).toEqual([]);
  });

  it('idempotent plan: the same input gives the same keys (the insert ignores duplicates)', () => {
    const a = planRatings({ lessons: [heldLesson()], now: NOW });
    const b = planRatings({ lessons: [heldLesson()], now: new Date(NOW.getTime() + 300_000) });
    expect(b.map((r) => r.dedup_key)).toEqual(a.map((r) => r.dedup_key));
  });
});

describe('ratingDue', () => {
  it.each([
    ['completed', '2026-10-04T14:00:00Z', true],
    ['late', '2026-10-04T14:00:00Z', true],
    ['scheduled', '2026-10-04T14:00:00Z', false],
    ['no_show', '2026-10-04T14:00:00Z', false],
    ['cancelled_by_admin', '2026-10-04T14:00:00Z', false],
    ['completed', '2026-10-04T16:00:00Z', false],
    ['completed', new Date(NOW.getTime() - RATING_LOOKBACK_MS).toISOString(), true],
    ['completed', new Date(NOW.getTime() - RATING_LOOKBACK_MS - 1).toISOString(), false],
  ] as const)('%s starting %s → %s', (status, starts_at, due) => {
    expect(ratingDue({ status, starts_at }, NOW)).toBe(due);
  });
});
