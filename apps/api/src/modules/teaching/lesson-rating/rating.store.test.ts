import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { RatingStore } from './rating.store';
import type { RatingTap } from './rating.rows';

const TAP: RatingTap = {
  lessonId: 'l1',
  guardianId: 'g1',
  rating: 'good',
  waMessageId: 'wamid.1',
  at: new Date('2026-11-01T10:00:00Z'),
};

describe('RatingStore error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate with the detail', async () => {
    const { db } = fakeDb({ lessons: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(new RatingStore(db).record(TAP))).toEqual({
      status: 409,
      body: { message: 'duplicate', detail: PG_ERRORS.unique.details },
    });
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ lessons: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(new RatingStore(db).record(TAP))).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
  });
});
