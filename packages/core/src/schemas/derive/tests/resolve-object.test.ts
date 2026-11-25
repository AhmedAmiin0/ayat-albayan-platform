import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { resolveObject } from '../derive';

const base = z.object({ name: z.string() });

describe('resolveObject', () => {
  it.each([
    ['optional', base.optional()],
    ['nullable', base.nullable()],
    ['nullish', base.nullish()],
    ['default', base.default({ name: 'x' })],
    ['prefault', base.prefault({ name: 'x' })],
    ['preprocess', z.preprocess((v) => v, base)],
    ['transform', base.transform((v) => v.name)],
    ['stacked', z.preprocess((v) => v, base.optional()).nullable()],
  ])('returns the same object behind %s', (_kind, schema) => {
    expect(resolveObject(schema)).toBe(base);
  });

  it('keeps the refinement of a refined object', () => {
    const refined = base.refine((v) => v.name !== '');
    const found = resolveObject(z.preprocess((v) => v, refined));
    expect(found).toBe(refined);
    expect(() => found.partial()).toThrow(
      '.partial() cannot be used on object schemas containing refinements',
    );
  });

  it.each([
    ['a union', z.union([base, z.string()])],
    ['an array', z.array(base)],
  ])('throws for %s', (_kind, schema) => {
    expect(() => resolveObject(schema)).toThrow('resolveObject: no object behind this schema');
  });
});
