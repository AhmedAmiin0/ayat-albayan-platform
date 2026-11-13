import type { LessonView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { lesson, SUHAILA } from '@/features/teaching/schedule/lesson/lesson-fixture';
import { t } from '@/lib/i18n/i18n';
import { teacherWord } from './teacher-word';

const STATUS = { tone: 'neutral', glyph: 'hollow', label: 'STATUS' } as const;
const START = '2026-10-03T10:00:00.000Z'; // 45 min
const word = (l: LessonView, iso: string) =>
  teacherWord(l, { now: new Date(iso), status: STATUS });
type Report = LessonView['students'][number]['report'];
const withReport = (report: Report) =>
  lesson({ starts_at: START, students: [{ ...SUHAILA, report }] });

describe('teacherWord (docs/48 TEACHER_WORD)', () => {
  it('before the start: «بانتظار تأكيدك», then «حضورك مؤكَّد»', () => {
    const l = lesson({ starts_at: START });
    expect(word(l, '2026-10-03T09:00:00.000Z')).toMatchObject({ label: t.teacherDash.awaiting, tone: 'act' });
    const said = { ...l, teacher_confirmed_at: '2026-10-02T09:00:00.000Z' };
    expect(word(said, '2026-10-03T09:00:00.000Z')).toMatchObject({ label: t.teacherBoard.confirmedChip, tone: 'ok' });
  });

  it('under way: «جارية الآن»; after the end with no report: «اكتب التقرير»', () => {
    const l = lesson({ starts_at: START });
    expect(word(l, '2026-10-03T10:10:00.000Z').label).toBe(t.today.running);
    expect(word(l, '2026-10-03T11:00:00.000Z').label).toBe(t.reports.open);
  });

  it('a draft: «أكمل التقرير»; in the edit window: the minutes to the family', () => {
    expect(word(withReport({ id: 'r', status: 'draft' }), '2026-10-03T11:00:00.000Z').label).toBe(t.reports.resume);
    const sent = withReport({ id: 'r', status: 'submitted', edit_until: '2026-10-03T11:12:00.000Z' });
    const w = word(sent, '2026-10-03T11:00:00.000Z');
    expect(w.tone).toBe('neutral');
    expect(w.label).toContain('12');
  });

  it('done or closed: the lesson-status chip', () => {
    const sent = withReport({ id: 'r', status: 'submitted', sent_at: '2026-10-03T11:00:00.000Z' });
    expect(word(sent, '2026-10-03T12:00:00.000Z')).toBe(STATUS);
    expect(word(lesson({ starts_at: START, status: 'cancelled_by_admin' }), '2026-10-03T09:00:00.000Z')).toBe(STATUS);
  });
});
