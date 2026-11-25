import { guardianCreateSchema } from '@ab/shared';
import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { parseOrThrow } from '@/common/http/http';
import { blankToNull, blanksToNull, listQuerySchema, orSafe, pageRange } from './http';

const createBody = blanksToNull(guardianCreateSchema);

describe('the guardian create body (parseOrThrow + blanksToNull)', () => {
  it('returns the parsed value; phones come out E.164 (R-STU-02)', () => {
    const dto = parseOrThrow(createBody, {
      name: 'ام جود',
      phone_e164: '0501234567',
      tz: 'Asia/Riyadh',
    });
    expect(dto.phone_e164).toBe('+966501234567');
  });

  it('throws 400 validation_failed with the issue path and reason', () => {
    try {
      parseOrThrow(createBody, { name: 'x', phone_e164: '@handle', tz: 'Asia/Riyadh' });
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
    expect(blankToNull({ a: '', b: 'x', c: { d: '' }, e: 0 })).toEqual({
      a: null,
      b: 'x',
      c: { d: null },
      e: 0,
    });
  });

  it('leaves non-objects and arrays alone', () => {
    expect(blankToNull('x')).toBe('x');
    expect(blankToNull(['', 'a'])).toEqual(['', 'a']);
    expect(blankToNull(undefined)).toBeUndefined();
  });

  it('blanksToNull runs it before the schema', () => {
    expect(blanksToNull(z.object({ a: z.string().nullable() })).parse({ a: '' })).toEqual({
      a: null,
    });
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

  it('keeps _: it matches itself, so names like um_ahmad still match', () => {
    expect(orSafe('um_ahmad')).toBe('um_ahmad');
  });
});
