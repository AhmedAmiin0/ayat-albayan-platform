import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import { blankToNull, blanksToNull } from './blanks';

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
});

describe('blanksToNull', () => {
  const body = blanksToNull(z.object({ a: z.string().nullable() }));

  it('runs blankToNull before the schema', () => {
    expect(body.parse({ a: '' })).toEqual({ a: null });
  });

  it('still refuses what the schema refuses', () => {
    expect(body.safeParse({ a: 1 }).success).toBe(false);
  });

  it("keeps the base schema's input type for clients", () => {
    expectTypeOf<z.input<typeof body>>().toEqualTypeOf<{ a: string | null }>();
  });
});
