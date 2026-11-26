import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { LessonProposalRepo } from '@/modules/teaching/lessons/proposals/lesson-proposals.repo';

const NEW = {
  lesson_id: 'l1',
  teacher_id: 't1',
  proposed_starts_at: '2026-11-01T10:00:00Z',
  note: null,
  created_by: 'p1',
};

describe('LessonProposalRepo error paths: the answer a failed query gives today', () => {
  it('create: a unique violation is the local 409 proposal_pending', async () => {
    const { db } = fakeDb({ lesson_proposals: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(new LessonProposalRepo(db).create(NEW))).toEqual({
      status: 409,
      body: { code: 'proposal_pending', message: 'proposal_pending' },
    });
  });

  it('create: any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ lesson_proposals: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(new LessonProposalRepo(db).create(NEW))).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
  });

  it('get: a unique violation is 409 duplicate', async () => {
    const { db } = fakeDb({ lesson_proposals: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(new LessonProposalRepo(db).get('p1'))).toEqual({
      status: 409,
      body: { message: 'duplicate' },
    });
  });
});
