import { describe, expect, it } from 'vitest';
import { emptyDraft } from '@/features/teaching/booking/draft/draft';
import { ABRAR, STUDENT_ID } from '@/features/teaching/booking/wizard-fixture';
import { outsideParams, shownDay } from './other-time-options';

describe('«وقت آخر» params and day', () => {
  it('asks for the draft teacher, length, students and the trial it moves', () => {
    const draft = {
      ...emptyDraft({ trial: true }),
      teacher: ABRAR,
      students: [{ id: STUDENT_ID, name: 'سهيلة', code: null }],
      trialDate: { upcomingId: 'L1', upcomingAt: null, count: 1 },
    };
    expect(outsideParams(draft)).toEqual({
      teacherId: ABRAR.id,
      durationMin: 45,
      studentIds: [STUDENT_ID],
      excludeLessonId: 'L1',
    });
    expect(outsideParams(emptyDraft())).toEqual({
      teacherId: '',
      durationMin: 45,
      studentIds: [],
      excludeLessonId: undefined,
    });
  });

  it('shows the picked day while the list has it, else the first, else none', () => {
    const days = new Map([
      ['2026-12-01', 1],
      ['2026-12-02', 2],
    ]);
    expect(shownDay(days, '2026-12-02')).toBe('2026-12-02');
    expect(shownDay(days, '2026-12-09')).toBe('2026-12-01');
    expect(shownDay(days, null)).toBe('2026-12-01');
    expect(shownDay(new Map(), null)).toBeNull();
  });
});
