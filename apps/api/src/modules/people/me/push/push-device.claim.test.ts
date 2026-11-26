import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { claimDevice } from './push-device.claim';

const CLAIM = { userId: 'p1', token: 'ExponentPushToken[x]', sessionId: 's1' };

describe('claimDevice error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate with the detail', async () => {
    const { db } = fakeDb({ 'rpc:claim_push_device': [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(claimDevice(db, CLAIM))).toEqual({
      status: 409,
      body: { message: 'duplicate' },
    });
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ 'rpc:claim_push_device': [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(claimDevice(db, CLAIM))).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
  });
});
