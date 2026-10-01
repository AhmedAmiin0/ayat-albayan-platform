import { BadRequestException, ConflictException } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { pageQueryShape, pageRange, parseOr400, searchTerm, throwIfDbError } from './http';

const pgError = (code: string) => ({ code, message: 'x', details: '', hint: '' }) as PostgrestError;
const pageQuery = z.object(pageQueryShape);

describe('http helpers (R-NFR-08)', () => {
  it('parseOr400 returns parsed data or throws 400', () => {
    expect(parseOr400(pageQuery, { page: '2' })).toEqual({ page: 2, pageSize: 25 });
    expect(() => parseOr400(pageQuery, { pageSize: '500' })).toThrow(BadRequestException);
  });

  it('search text cannot inject PostgREST or() syntax', () => {
    expect(searchTerm('a,b),status.eq.lost')).toBe('a b  status.eq.lost');
    expect(parseOr400(pageQuery, { q: ' (*) ' }).q).toBeUndefined();
    expect(parseOr400(pageQuery, { q: '0501' }).q).toBe('0501');
  });

  it('pageRange maps 1-based pages to inclusive row ranges', () => {
    expect(pageRange({ page: 1, pageSize: 25 })).toEqual([0, 24]);
    expect(pageRange({ page: 3, pageSize: 10 })).toEqual([20, 29]);
  });

  it('throwIfDbError: unique violation → 409, others → plain error, null → nothing', () => {
    expect(() => throwIfDbError(null)).not.toThrow();
    expect(() => throwIfDbError(pgError('23505'))).toThrow(ConflictException);
    expect(() => throwIfDbError(pgError('42P01'))).toThrow(/db:/);
  });
});
