import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { CallsRepo } from './calls.repo';

const CALL = { direction: 'inbound', phone_e164: '+201001234567', status: 'ringing' };

describe('CallsRepo errors', () => {
  it('a repeated unique key is no new row, not an error', async () => {
    const { db } = fakeDb({ wa_calls: [{ error: PG_ERRORS.unique }] });
    await expect(new CallsRepo(db).insert(CALL)).resolves.toBeNull();
  });

  it('another error answers through the default db error map', async () => {
    const { db } = fakeDb({
      wa_calls: [{ error: PG_ERRORS.other }, { error: PG_ERRORS.foreignKey }],
    });
    await expect(new CallsRepo(db).get('c1')).rejects.toThrow('db error XX000: boom');
    expect((await answerOfRejection(new CallsRepo(db).byWaCallId('w1'))).status).toBe(409);
  });
});
