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
    expectTypeOf<Date>().not.toExtend<Json>();
    expectTypeOf<() => number>().not.toExtend<Json>();
    expectTypeOf<{ at: { run: () => number } }>().not.toExtend<Json>();
  });
});
