import { BadRequestException, ConflictException } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { dbError, sentOnly } from './http';

const pgError = (code: string) =>
  ({ code, message: 'm', details: 'd', hint: '', name: 'PostgrestError' }) as PostgrestError;

describe('http helpers (R-TCH-01)', () => {
  it('sentOnly drops defaults the client did not send', () => {
    expect(sentOnly({ rate_60: 120, status: 'active' }, { rate_60: 120 })).toEqual({ rate_60: 120 });
    expect(sentOnly({ status: 'active' }, null)).toEqual({});
  });

  it.each([
    ['23505', ConflictException],
    ['23503', ConflictException],
    ['PGRST103', BadRequestException],
  ])('dbError maps %s to an HTTP exception', (code, type) => {
    expect(dbError(pgError(code))).toBeInstanceOf(type);
  });

  it('dbError keeps unknown errors as plain 500s', () => {
    const err = dbError(pgError('XX000'));
    expect(err).not.toBeInstanceOf(ConflictException);
    expect(err.message).toContain('XX000');
  });
});
