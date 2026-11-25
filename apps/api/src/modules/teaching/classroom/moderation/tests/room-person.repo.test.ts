import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { RoomPersonRepo } from '@/modules/teaching/classroom/moderation/room-person.repo';

const DUPLICATE = { status: 409, body: { message: 'duplicate', detail: PG_ERRORS.unique.details } };
const FAILED = { status: 500, body: 'db error XX000: boom' };
const KICKED = [{ userId: 'u1' }];

describe('RoomPersonRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate with the detail', async () => {
    const { db } = fakeDb({ classroom_participants: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(new RoomPersonRepo(db).identitiesOf('l1', KICKED))).toEqual(
      DUPLICATE,
    );
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ classroom_participants: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(new RoomPersonRepo(db).identitiesOf('l1', KICKED))).toEqual(
      FAILED,
    );
  });
});
