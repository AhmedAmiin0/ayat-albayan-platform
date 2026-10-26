import { describe, expect, it } from 'vitest';
import { callsOf, chainDb } from '../../reminders/chain-db.fake';
import { threadRow } from '../inbox.fakes';
import { upcomingLessons } from './thread-lessons';
import { toThreadView } from './threads.mapper';

const NOW = new Date('2026-10-02T08:00:00Z');
const row = { id: 'l1', starts_at: '2026-10-04T14:00:00+00:00', meeting_link: null, teacher: { tz: 'Africa/Cairo' } };
const view = (over: Parameters<typeof threadRow>[0]) => toThreadView(threadRow(over), NOW);

describe('upcomingLessons (template composer, rule 6)', () => {
  it('a guardian: open lessons of their children only, named, in the guardian’s tz', async () => {
    const students = [{ student: { name: 'سهيلة' } }, { student: null }];
    const { db, log } = chainDb({ lessons: [{ data: [{ ...row, lesson_students: students }] }] });
    const thread = view({ guardian_id: 'g1', guardian_tz: 'Europe/London', teacher_id: null });
    expect(await upcomingLessons(db, { thread, now: NOW })).toEqual([
      { id: 'l1', starts_at: row.starts_at, meeting_link: null, student_names: ['سهيلة'], tz: 'Europe/London' },
    ]);
    expect(callsOf(log, 'lessons')).toEqual(
      expect.arrayContaining([
        ['eq', ['lesson_students.student.guardian_id', 'g1']],
        ['in', ['status', ['scheduled', 'confirmed']]],
        ['gt', ['starts_at', NOW.toISOString()]],
      ]),
    );
  });

  it('a teacher: their lessons in their own tz', async () => {
    const { db, log } = chainDb({ lessons: [{ data: [{ ...row, lesson_students: [{ student: { name: 'ياسين' } }] }] }] });
    const thread = view({ guardian_id: null, teacher_id: 't1' });
    expect(await upcomingLessons(db, { thread, now: NOW })).toMatchObject([{ student_names: ['ياسين'], tz: 'Africa/Cairo' }]);
    expect(callsOf(log, 'lessons')).toContainEqual(['eq', ['teacher_id', 't1']]);
  });

  it('teacher mode: a guardian thread lists only the signed-in teacher’s lessons', async () => {
    const { db, log } = chainDb({ lessons: [{ data: [] }] });
    const thread = view({ guardian_id: 'g1', teacher_id: null });
    await upcomingLessons(db, { thread, now: NOW, teacherId: 't-me' });
    expect(callsOf(log, 'lessons')).toEqual(
      expect.arrayContaining([
        ['eq', ['lesson_students.student.guardian_id', 'g1']],
        ['eq', ['teacher_id', 't-me']],
      ]),
    );
  });

  it('a lead or an unknown number has no lessons (nothing is read)', async () => {
    const { db, log } = chainDb();
    expect(await upcomingLessons(db, { thread: view({ guardian_id: null, teacher_id: null }), now: NOW })).toEqual([]);
    expect(log).toHaveLength(0);
  });
});
