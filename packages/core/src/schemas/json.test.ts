import { describe, expectTypeOf, it } from 'vitest';
import type { Json } from './index.js';

describe('Json', () => {
  it('accepts primitives and null', () => {
    expectTypeOf<string>().toExtend<Json>();
    expectTypeOf<number>().toExtend<Json>();
    expectTypeOf<boolean>().toExtend<Json>();
    expectTypeOf<null>().toExtend<Json>();
  });

  it('accepts nested objects and arrays', () => {
    const value: Json = { a: [1, 'two', { b: null, c: [true, { d: [] }] }], e: undefined };
    expectTypeOf(value).toExtend<Json>();
    expectTypeOf<{ list: { id: string; tags: string[] }[] }>().toExtend<Json>();
  });

  it('rejects values JSON cannot carry', () => {
    // @ts-expect-error a Date is not plain JSON
    const date: Json = new Date(0);
    // @ts-expect-error a function is not JSON
    const fn: Json = () => 1;
    // @ts-expect-error nested functions are rejected too
    const nested: Json = { at: { run: () => 1 } };
    expectTypeOf(date).toEqualTypeOf<Json>();
    expectTypeOf(fn).toEqualTypeOf<Json>();
    expectTypeOf(nested).toEqualTypeOf<Json>();
  });
});
