import { ConflictException } from '@nestjs/common';
import { PostgrestError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { answerOf } from '@/common/db/testing/db-answer';
import { pgError, raisedAs } from '@/common/db/errors';

const raised = (message: string) =>
  new PostgrestError({ code: 'P0001', message, details: '', hint: '' });
const conflictOf = (code: string) => new ConflictException({ code, message: code });

describe('raisedAs: one answer for a list of raised codes', () => {
  it('maps each code to the answer built from that code', () => {
    const map = { raised: raisedAs(['stale_time', 'teacher_clash'], conflictOf) };
    expect(answerOf(pgError(raised('teacher_clash'), map))).toEqual({
      status: 409,
      body: { code: 'teacher_clash', message: 'teacher_clash' },
    });
  });

  it('leaves any other raised text to the default 500', () => {
    const map = { raised: raisedAs(['stale_time'], conflictOf) };
    expect(answerOf(pgError(raised('something else'), map))).toEqual({
      status: 500,
      body: 'db error P0001: something else',
    });
  });

  it('never matches a key of Object.prototype', () => {
    const map = { raised: raisedAs([], conflictOf) };
    expect(answerOf(pgError(raised('toString'), map)).status).toBe(500);
  });
});
