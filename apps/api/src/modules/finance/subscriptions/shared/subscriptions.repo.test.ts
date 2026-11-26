import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { SubscriptionsRepo } from './subscriptions.repo';

describe('SubscriptionsRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate with the detail', async () => {
    const { db } = fakeDb({ subscriptions: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(new SubscriptionsRepo(db).get('s1'))).toEqual({
      status: 409,
      body: { message: 'duplicate', detail: PG_ERRORS.unique.details },
    });
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ subscriptions: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(new SubscriptionsRepo(db).get('s1'))).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
  });
});

describe('SubscriptionsRepo.withStudentFor', () => {
  it('reads the students’ packages with their student, oldest first', async () => {
    const row = { id: 'p1', student_id: 's1', student: { id: 's1', code: 'AB-0001', name: 'x' } };
    const { db, argsOf } = fakeDb({ subscriptions: [{ data: [row] }] });
    expect(await new SubscriptionsRepo(db).withStudentFor(['s1', 's2'])).toEqual([row]);
    expect(argsOf('subscriptions', 'select')).toEqual(['*, student:students(id, code, name)']);
    expect(argsOf('subscriptions', 'in')).toEqual(['student_id', ['s1', 's2']]);
  });
});
