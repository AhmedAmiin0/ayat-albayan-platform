import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { feedbackRow, LESSON_ID, NOW, STUDENT_ID } from './feedback.fakes';
import { FeedbackRepo } from './feedback.repo';

const T = 'lesson_feedback';
const row = feedbackRow();
const insert = {
  ...{ lesson_id: row.lesson_id, student_id: row.student_id, guardian_id: row.guardian_id, teacher_id: row.teacher_id },
  ...{ kind: row.kind, token_hash: row.token_hash, requested_at: row.requested_at, expires_at: row.expires_at },
};

describe('FeedbackQueries — an answer is written once and never reset', () => {
  it('answer: only an unanswered row matches (submitted_at is null), so a second submit finds nothing', async () => {
    const { db, calls, argsOf } = fakeDb({ [T]: [{ data: feedbackRow() }, { data: null }] });
    const q = new FeedbackRepo(db);
    const patch = { rating: 5, recommend: 'yes', note: null, contact_phone: '+966501234567', submitted_at: NOW.toISOString() } as const;
    await expect(q.answer('r1', patch)).resolves.toMatchObject({ lesson_id: LESSON_ID });
    expect(argsOf(T, 'update')).toEqual([patch]);
    expect(calls.filter((c) => c.method === 'is').map((c) => c.args)).toEqual([['submitted_at', null]]);
    await expect(q.answer('r1', patch)).resolves.toBeNull();
  });

  it('issue: a new row is inserted; a clash re-links only an unanswered row', async () => {
    const { db, calls } = fakeDb({
      [T]: [{ data: feedbackRow() }, { error: { code: '23505', message: 'dup' } }, { data: feedbackRow() }, { error: { code: '23505', message: 'dup' } }, { data: null }],
    });
    const q = new FeedbackRepo(db);
    await expect(q.issue(insert)).resolves.toBeTruthy();
    expect(calls.map((c) => c.method)).toEqual(['insert', 'select', 'single']);
    calls.length = 0;
    await expect(q.issue(insert)).resolves.toBeTruthy();
    const update = calls.find((c) => c.method === 'update');
    expect(update?.args[0]).toMatchObject({ token_hash: insert.token_hash, expires_at: insert.expires_at });
    expect(update?.args[0]).not.toHaveProperty('lesson_id');
    expect(calls.find((c) => c.method === 'match')?.args).toEqual([{ lesson_id: LESSON_ID, student_id: STUDENT_ID }]);
    expect(calls.find((c) => c.method === 'is')?.args).toEqual(['submitted_at', null]);
    await expect(q.issue(insert)).resolves.toBeNull();
  });

  it('issue: any other database error surfaces', async () => {
    const { db } = fakeDb({ [T]: [{ error: { code: '23503', message: 'fk' } }] });
    await expect(new FeedbackRepo(db).issue(insert)).rejects.toThrow();
  });

  describe('requestContext', () => {
    const tables = (pkg: string | null, onLesson = true) => ({
      lessons: [{ data: { status: 'completed', teacher_id: 't1', rule_id: pkg ? 'rule' : null } }],
      lesson_students: [{ data: onLesson ? { student_id: STUDENT_ID, attendance: 'on_time' } : null }],
      schedule_rules: [{ data: pkg ? { package: pkg } : null }],
      teachers: [{ data: { id: 't1', display_name_ar: 'أبرار' } }],
      students: [{ data: { id: STUDENT_ID, name: 'سهيلة', guardian_id: 'g1' } }],
      guardians: [{ data: { id: 'g1', phone_e164: '+966501234567' } }],
    });

    it('the free-trial rule makes it a trial; a package, or no rule, a subscription', async () => {
      const kind = async (pkg: string | null) =>
        (await new FeedbackRepo(fakeDb(tables(pkg)).db).requestContext(LESSON_ID, STUDENT_ID))?.kind;
      expect(await kind('trial')).toBe('trial');
      expect(await kind('8')).toBe('subscription');
      expect(await kind(null)).toBe('subscription');
    });

    it('maps the teacher, the student and the guardian phone', async () => {
      const ctx = await new FeedbackRepo(fakeDb(tables('8')).db).requestContext(LESSON_ID, STUDENT_ID);
      expect(ctx).toEqual({
        lessonStatus: 'completed',
        attendance: 'on_time',
        teacher: { id: 't1', name: 'أبرار' },
        kind: 'subscription',
        student: { id: STUDENT_ID, name: 'سهيلة' },
        guardian: { id: 'g1', phone: '+966501234567' },
      });
    });

    it('null for a student who is not on the lesson, and for an unknown lesson', async () => {
      expect(await new FeedbackRepo(fakeDb(tables('8', false)).db).requestContext(LESSON_ID, STUDENT_ID)).toBeNull();
      const none = fakeDb({ lessons: [{ data: null }] });
      expect(await new FeedbackRepo(none.db).requestContext(LESSON_ID, STUDENT_ID)).toBeNull();
    });
  });
});
