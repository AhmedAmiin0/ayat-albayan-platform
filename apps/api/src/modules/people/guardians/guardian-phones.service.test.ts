import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import type { FakeResult } from '@/common/db/testing/fake-db';
import { fakeDb } from '@/common/db/testing/fake-db';
import { GuardianPhonesService } from './guardian-phones.service';

const removeWith = (error: FakeResult['error']) => {
  const { db } = fakeDb({ 'rpc:remove_family_phone': [{ error }] });
  const second = { guardianId: 'g1', phone: '+201000000001', actorId: 'a1' };
  return answerOfRejection(new GuardianPhonesService(db).removeSecond(second));
};

describe('GuardianPhonesService error paths: the answer a failed query gives today', () => {
  it('the phone_not_found refusal is 404 phone_not_found', async () => {
    expect(await removeWith({ code: 'P0001', message: 'phone_not_found' })).toEqual({
      status: 404,
      body: { code: 'phone_not_found', message: 'phone_not_found' },
    });
  });

  it('a unique violation is the guardians 409 conflict', async () => {
    expect(await removeWith(PG_ERRORS.unique)).toEqual({
      status: 409,
      body: { statusCode: 409, message: 'conflict', error: 'Conflict' },
    });
  });

  it('any other error is the plain 500 of the default map', async () => {
    expect(await removeWith(PG_ERRORS.other)).toEqual({ status: 500, body: 'db error XX000: boom' });
  });
});
