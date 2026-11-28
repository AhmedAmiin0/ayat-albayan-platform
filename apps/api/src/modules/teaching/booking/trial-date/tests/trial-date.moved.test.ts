import { describe, expect, it } from 'vitest';
import { movedFrom, movedTrial } from '@/modules/teaching/booking/trial-date/trial-date.moved';

const NEXT = {
  id: 'l-old',
  rule_id: null,
  status: 'scheduled' as const,
  starts_at: '2026-12-01T15:00:00Z',
  teacher_id: 't1',
};

describe('movedFrom', () => {
  it('the upcoming trial with the students it holds', () => {
    expect(movedFrom(NEXT, ['s1'])).toEqual({ ...NEXT, student_ids: ['s1'] });
  });

  it('copies only the moved-trial fields', () => {
    const extra = { ...NEXT, created_by: 'p1' };
    expect(Object.keys(movedFrom(extra, []))).not.toContain('created_by');
  });
});

describe('movedTrial', () => {
  it('lesson_rescheduled for the new lesson, from the old start', () => {
    const old = movedFrom(NEXT, ['s1']);
    const result = {
      lesson_id: 'l-new',
      starts_at: '2026-12-02T15:00:00Z',
      ends_at: '2026-12-02T15:45:00Z',
      teacher_id: 't1',
      moved_from_id: 'l-old',
    };
    const change = movedTrial({ old, result, actorId: 'a1', familyNotice: true });
    expect(change).toEqual({
      kind: 'lesson_rescheduled',
      lessonId: 'l-new',
      fromStartsAt: NEXT.starts_at,
      actorId: 'a1',
      familyNotice: true,
    });
  });
});
