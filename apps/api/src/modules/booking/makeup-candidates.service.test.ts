import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { IDS } from './booking.fakes';
import { MakeupCandidates } from './makeup-candidates.service';

const NOW = new Date('2026-10-03T10:00:00Z');
const row = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  starts_at: '2026-09-30T14:00:00+00:00',
  ends_at: '2026-09-30T14:45:00+00:00',
  status: 'no_show',
  teacher: { id: IDS.teacher, display_name_ar: 'أبرار' },
  rule: { package: '8' },
  ...over,
});

describe('MakeupCandidates.list (R-SCH-10)', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('asks for the student\'s charged no-shows / excuses of the last 60 days that are not makeups', async () => {
    const { db, calls } = fakeDb({ lessons: [{ data: [] }] });
    await new MakeupCandidates(db).list(IDS.s1);
    const args = (m: string) => calls.filter((c) => c.method === m).map((c) => c.args);
    expect(args('eq')).toEqual([['lesson_students.student_id', IDS.s1], ['lesson_students.chargeable', true]]);
    expect(args('in')).toEqual([['status', ['no_show', 'excused']]]);
    expect(args('gte')).toEqual([['starts_at', '2026-08-04T10:00:00.000Z']]);
    expect(args('is')).toEqual([['makeup_of_id', null]]);
    // newest first, on the lessons themselves (not on the embed)
    expect(args('order')).toEqual([['starts_at', { ascending: false }]]);
  });

  it('maps a missed lesson: ISO start, minutes from its length, the teacher', async () => {
    const { db } = fakeDb({ lessons: [{ data: [row('L1')] }, { data: [] }] });
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
      lessons: [
        { data: [row('L1'), row('L2', { rule: { package: 'trial' } }), row('L3', { status: 'excused' })] },
        { data: [{ makeup_of_id: 'L1' }] },
      ],
    });
    const list = await new MakeupCandidates(db).list(IDS.s1);
    expect(list.map((c) => [c.lesson_id, c.status])).toEqual([['L3', 'excused']]);
    // the trial is not even looked up; the cancelled / moved makeups free their lesson
    expect(calls.filter((c) => c.method === 'in').at(-1)?.args).toEqual(['makeup_of_id', ['L1', 'L3']]);
    // per student: in a group lesson only the student who has a makeup loses the lesson
    expect(calls.filter((c) => c.method === 'eq').at(-1)?.args).toEqual(['makeup_student_id', IDS.s1]);
    expect(calls.find((c) => c.method === 'not')?.args).toEqual(['status', 'in', '(cancelled_by_teacher,cancelled_by_admin,rescheduled)']);
  });

  it('no missed lessons → [] and no second query', async () => {
    const { db, calls } = fakeDb({ lessons: [{ data: [] }] });
    expect(await new MakeupCandidates(db).list(IDS.s1)).toEqual([]);
    expect(calls.filter((c) => c.method === 'select')).toHaveLength(1);
  });
});
