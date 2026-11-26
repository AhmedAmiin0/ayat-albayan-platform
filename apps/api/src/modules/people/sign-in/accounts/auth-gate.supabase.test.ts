import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import type { SignInConfig } from '@/modules/people/sign-in/sign-in.ports';
import { SupabaseAuthGate } from './auth-gate.supabase';

const CONFIG: SignInConfig = {
  pepper: null,
  passwordMinLength: 8,
  supabaseUrl: 'http://localhost',
  signInKey: 'key',
};

describe('SupabaseAuthGate error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate with the detail', async () => {
    const { db } = fakeDb({ 'rpc:auth_user_id_by_email': [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(new SupabaseAuthGate(db, CONFIG).idByEmail('a@b.c'))).toEqual({
      status: 409,
      body: { message: 'duplicate' },
    });
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ 'rpc:auth_user_id_by_email': [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(new SupabaseAuthGate(db, CONFIG).idByEmail('a@b.c'))).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
  });
});
