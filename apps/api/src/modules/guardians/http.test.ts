import { guardianCreateSchema } from '@ab/shared';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { blankToNull, dbError, listQuerySchema, orSafe, pageRange, parse } from './http';

describe('parse', () => {
  it('returns the parsed value; phones come out E.164 (R-STU-02)', () => {
    const dto = parse(guardianCreateSchema, { name: 'ام جود', phone_e164: '0501234567', tz: 'Asia/Riyadh' });
    expect(dto.phone_e164).toBe('+966501234567');
  });

  it('throws 400 validation_failed with the issue path and reason', () => {
    try {
      parse(guardianCreateSchema, { name: 'x', phone_e164: '@handle', tz: 'Asia/Riyadh' });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      expect((e as BadRequestException).getResponse()).toEqual({
        message: 'validation_failed',
        issues: [{ path: 'phone_e164', message: 'not_a_number' }],
      });
    }
  });
});

describe('blankToNull', () => {
  it("turns '' into null, recursing into nested objects", () => {
    expect(blankToNull({ a: '', b: 'x', c: { d: '' }, e: 0 })).toEqual({ a: null, b: 'x', c: { d: null }, e: 0 });
  });

  it('leaves non-objects and arrays alone', () => {
    expect(blankToNull('x')).toBe('x');
    expect(blankToNull(['', 'a'])).toEqual(['', 'a']);
    expect(blankToNull(undefined)).toBeUndefined();
  });
});

describe('listQuerySchema + pageRange (R-NFR-08)', () => {
  it('defaults to page 1 of 20', () => {
    const q = listQuerySchema.parse({});
    expect(q).toEqual({ search: '', page: 1, pageSize: 20 });
    expect(pageRange(q)).toEqual([0, 19]);
  });

  it('coerces query strings and computes the inclusive range', () => {
    const q = listQuerySchema.parse({ page: '3', pageSize: '10', search: ' سهيلة ' });
    expect(q.search).toBe('سهيلة');
    expect(pageRange(q)).toEqual([20, 29]);
  });

  it('caps pageSize at 100', () => {
    expect(listQuerySchema.safeParse({ pageSize: '500' }).success).toBe(false);
  });
});

describe('orSafe', () => {
  it('strips characters that break a PostgREST or() filter', () => {
    expect(orSafe('a,b(c)*%:"\\')).toBe('a b c');
  });

  it('strips the ilike single-character wildcard _', () => {
    expect(orSafe('a_b')).toBe('a b');
    expect(orSafe('___')).toBe('');
  });
});

describe('dbError', () => {
  it('maps unique / FK violations to 409 with the given message', () => {
    const e = dbError({ code: '23505', message: 'dup' }, 'phone_taken');
    expect(e).toBeInstanceOf(ConflictException);
    expect(e.message).toBe('phone_taken');
    expect(dbError({ code: '23503', message: 'fk' })).toBeInstanceOf(ConflictException);
  });

  it('maps not-found and bad-argument codes', () => {
    expect(dbError({ code: 'P0002', message: '' })).toBeInstanceOf(NotFoundException);
    expect(dbError({ code: 'PGRST116', message: '' })).toBeInstanceOf(NotFoundException);
    expect(dbError({ code: '22023', message: 'self' })).toBeInstanceOf(BadRequestException);
  });

  it('falls back to 500', () => {
    expect(dbError({ message: 'boom' })).toBeInstanceOf(InternalServerErrorException);
  });
});
