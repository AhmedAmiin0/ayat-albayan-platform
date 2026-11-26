import { BadRequestException, ConflictException } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { parseOrThrow } from '@/common/http/http';
import { pageQueryShape, throwIfDbError } from './http';

const pgError = (code: string) => ({ code, message: 'x', details: '', hint: '' }) as PostgrestError;
const pageQuery = z.object(pageQueryShape);

function badRequestBody(run: () => unknown): unknown {
  try {
    run();
  } catch (e) {
    return e instanceof BadRequestException ? e.getResponse() : e;
  }
  return null;
}

describe('http helpers (R-NFR-08)', () => {
  it('the page query parses; a bad one is the one 400 envelope (z1a)', () => {
    expect(parseOrThrow(pageQuery, { page: '2' })).toEqual({ page: 2, pageSize: 25 });
    expect(() => parseOrThrow(pageQuery, { pageSize: '500' })).toThrow(BadRequestException);
    expect(badRequestBody(() => parseOrThrow(pageQuery, { pageSize: '500' }))).toEqual({
      message: 'validation_failed',
      issues: [{ path: 'pageSize', message: expect.any(String) }],
    });
  });

  it('search text cannot inject PostgREST or() syntax', () => {
    expect(parseOrThrow(pageQuery, { q: 'a,b),status.eq.lost' }).q).toBe('a b  status.eq.lost');
    expect(parseOrThrow(pageQuery, { q: ' (*) ' }).q).toBeUndefined();
    expect(parseOrThrow(pageQuery, { q: '0501' }).q).toBe('0501');
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
