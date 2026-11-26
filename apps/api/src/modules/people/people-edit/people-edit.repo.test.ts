import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { PeopleEditRepo } from './people-edit.repo';

const PHONE = { studentId: 's1', phone: '+201000000001', actorId: 'a1' };

describe('PeopleEditRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation on a read is 409 duplicate', async () => {
    const { db } = fakeDb({ students: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(new PeopleEditRepo(db).view('s1'))).toEqual({
      status: 409,
      body: { message: 'duplicate' },
    });
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ students: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(new PeopleEditRepo(db).view('s1'))).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
  });

  it('set_student_phone maps a unique violation to 409 phone_taken', async () => {
    const { db } = fakeDb({ 'rpc:set_student_phone': [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(new PeopleEditRepo(db).setStudentPhone(PHONE))).toEqual({
      status: 409,
      body: { code: 'phone_taken', message: 'phone_taken' },
    });
  });

  it('set_student_phone falls back to the default 500 for an unmapped error', async () => {
    const { db } = fakeDb({ 'rpc:set_student_phone': [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(new PeopleEditRepo(db).setStudentPhone(PHONE))).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
  });
});
