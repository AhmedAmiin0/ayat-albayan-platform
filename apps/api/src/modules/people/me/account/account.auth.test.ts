import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { SupabaseAccountAuth } from './account.auth';

const CONFIG = { passwordMinLength: 8, supabaseUrl: 'http://supabase.test', signInKey: 'k' };
const INPUT = { userId: 'u1', keep: null };

function revokeWith(error: { code: string; message: string }) {
  const { db } = fakeDb({ 'rpc:revoke_other_user_sessions': [{ error }] });
  return answerOfRejection(new SupabaseAccountAuth(db, CONFIG).revokeOtherSessions(INPUT));
}

describe('SupabaseAccountAuth.revokeOtherSessions: a failed revoke answers through the db map', () => {
  it('a unique violation is 409 duplicate', async () => {
    expect(await revokeWith(PG_ERRORS.unique)).toEqual({
      status: 409,
      body: { message: 'duplicate' },
    });
  });

  it('any other error is the plain 500 of the default map', async () => {
    expect(await revokeWith(PG_ERRORS.other)).toEqual({ status: 500, body: 'db error XX000: boom' });
  });
});
