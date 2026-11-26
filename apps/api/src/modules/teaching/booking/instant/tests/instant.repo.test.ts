import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import type { Db } from '@/common/db/db.module';
import type { BookingPayload } from '@/modules/teaching/booking/core/booking.mapper';
import { InstantRepo } from '@/modules/teaching/booking/instant/instant.repo';

const DUPLICATE = { status: 409, body: { message: 'duplicate' } };
const FAILED = { status: 500, body: 'db error XX000: boom' };
const PAYLOAD = { rule: {} } as unknown as BookingPayload;
const RPC = 'rpc:create_instant_lesson';
const create = (db: Db) => new InstantRepo(db).create(PAYLOAD, 'actor');
const REPLAY_RACE = { code: '23505', message: 'duplicate key "lessons_client_request_id_key"' };

describe('InstantRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate with the detail', async () => {
    const { db } = fakeDb({ [RPC]: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(create(db))).toEqual(DUPLICATE);
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ [RPC]: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(create(db))).toEqual(FAILED);
  });

  it('a lost client_request_id race is retried once; the retry’s error is the answer', async () => {
    const { db, trips } = fakeDb({ [RPC]: [{ error: REPLAY_RACE }, { error: PG_ERRORS.other }] });
    expect(await answerOfRejection(create(db))).toEqual(FAILED);
    expect(trips).toEqual([RPC, RPC]);
  });
});
