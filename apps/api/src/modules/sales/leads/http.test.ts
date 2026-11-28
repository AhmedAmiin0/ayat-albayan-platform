import { BadRequestException, ConflictException } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { searchTerm, throwIfDbError } from './http';

const pgError = (code: string) => ({ code, message: 'x', details: '', hint: '' }) as PostgrestError;

function badRequestBody(run: () => unknown): unknown {
  try {
    run();
  } catch (e) {
    return e instanceof BadRequestException ? e.getResponse() : e;
  }
  return null;
}

describe('lead http helpers (R-NFR-08)', () => {
  it('search text cannot inject PostgREST or() syntax', () => {
    expect(searchTerm('a,b),status.eq.lost')).toBe('a b  status.eq.lost');
    expect([searchTerm(' (*) '), searchTerm(undefined)]).toEqual([undefined, undefined]);
    expect(searchTerm('0501')).toBe('0501');
  });

  it('throwIfDbError: duplicate_phone on a unique violation, else the default map', () => {
    expect(() => throwIfDbError(null)).not.toThrow();
    expect(badRequestBody(() => throwIfDbError(pgError('23505')))).toMatchObject({
      response: { code: 'duplicate_phone' },
    });
    expect(() => throwIfDbError(pgError('23503'))).toThrow(ConflictException);
    expect(() => throwIfDbError(pgError('42P01'))).toThrow(/db error 42P01/);
  });
});
