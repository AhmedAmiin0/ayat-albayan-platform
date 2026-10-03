import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { IDS } from './booking.fakes';
import { MakeupCandidates } from './makeup-candidates.service';

const NOW = new Date('2026-10-03T10:00:00Z');
const row = (id: string, over: Record<string, unknown> = {}) => ({
  lesson_id: id,
  lesson: {
    id,
    starts_at: '2026-09-30T14:00:00+00:00',
    ends_at: '2026-09-30T14:45:00+00:00',
    status: 'no_show',
    makeup_of_id: null,
    teacher: { id: IDS.teacher, display_name_ar: 'أبرار' },
    rule: { package: '8' },
    ...over,
  },
});

describe('MakeupCandidates.list (R-SCH-10)', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('asks for the student\'s charged no-shows / excuses of the last 60 days that are not makeups', async () => {
    const { db, calls } = fakeDb({ lesson_students: [{ data: [] }] });
    await new MakeupCandidates(db).list(IDS.s1);
    const args = (m: string) => calls.filter((c) => c.method === m).map((c) => c.args);
    expect(args('eq')).toEqual([['student_id', IDS.s1], ['chargeable', true]]);
    expect(args('in')).toEqual([['lesson.status', ['no_show', 'excused']]]);
    expect(args('gte')).toEqual([['lesson.starts_at', '2026-08-04T10:00:00.000Z']]);
    expect(args('is')).toEqual([['lesson.makeup_of_id', null]]);
  });

  it('maps a missed lesson: ISO start, minutes from its length, the teacher', async () => {
    const { db } = fakeDb({ lesson_students: [{ data: [row('L1')] }], lessons: [{ data: [] }] });
    expect(await new MakeupCandidates(db).list(IDS.s1)).toEqual([
      {
        lesson_id: 'L1',
        starts_at: '2026-09-30T14:00:00.000Z',
        status: 'no_show',
        duration_min: 45,
        teacher: { id: IDS.teacher, display_name_ar: 'أبرار' },
      },
    ]);
  });

  it('leaves out a trial and a lesson that already has an active makeup', async () => {
    const { db, calls } = fakeDb({
      lesson_students: [{ data: [row('L1'), row('L2', { rule: { package: 'trial' } }), row('L3', { status: 'excused' })] }],
      lessons: [{ data: [{ makeup_of_id: 'L1' }] }],
    });
    const list = await new MakeupCandidates(db).list(IDS.s1);
    expect(list.map((c) => [c.lesson_id, c.status])).toEqual([['L3', 'excused']]);
    // the trial is not even looked up; the cancelled / moved makeups free their lesson
    expect(calls.find((c) => c.table === 'lessons' && c.method === 'in')?.args).toEqual(['makeup_of_id', ['L1', 'L3']]);
    expect(calls.find((c) => c.method === 'not')?.args).toEqual(['status', 'in', '(cancelled_by_teacher,cancelled_by_admin,rescheduled)']);
  });

  it('no missed lessons → [] and no second query', async () => {
    const { db, calls } = fakeDb({ lesson_students: [{ data: [] }] });
    expect(await new MakeupCandidates(db).list(IDS.s1)).toEqual([]);
    expect(calls.some((c) => c.table === 'lessons')).toBe(false);
  });
});
