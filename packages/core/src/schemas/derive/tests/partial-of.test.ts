import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { hasAnyValue, partialOf } from '../derive';

const base = z.object({
  name: z.string().min(1),
  age: z.int().min(3),
  status: z.enum(['active', 'paused']).default('active'),
});

describe('partialOf', () => {
  it('parses a one-field body to that field only, unlike zod .partial()', () => {
    expect(partialOf(base).parse({ name: 'Sara' })).toEqual({ name: 'Sara' });
    expect(base.partial().parse({ name: 'Sara' })).toEqual({ name: 'Sara', status: 'active' });
  });

  it('drops a .prefault() the same way', () => {
    const withPrefault = z.object({ tags: z.array(z.string()).prefault([]) });
    expect(partialOf(withPrefault).parse({})).toEqual({});
    expect(withPrefault.partial().parse({})).toEqual({ tags: [] });
  });

  it('keeps a strict base strict', () => {
    expect(partialOf(base.strict()).safeParse({ extra: 1 }).success).toBe(false);
  });

  it('keeps the base keys in their order', () => {
    expect(Object.keys(partialOf(base).shape)).toEqual(Object.keys(base.shape));
  });

  it('keeps each field check', () => {
    expect(partialOf(base).safeParse({ age: 1 }).success).toBe(false);
  });

  it('refuses a refined base', () => {
    const refined = base.refine((v) => v.age > 3);
    expect(() => partialOf(refined)).toThrow('partialOf: refine the edge schema, not the base');
  });

  it('still fills a default nested inside another wrapper', () => {
    const nested = z.object({ note: z.string().default('x').nullable() });
    expect(partialOf(nested).parse({})).toEqual({ note: 'x' });
  });

  it('has no required key and no default in the input JSON schema', () => {
    const json = z.toJSONSchema(partialOf(base), { io: 'input' });
    expect(json).not.toHaveProperty('required');
    expect(JSON.stringify(json)).not.toContain('"default"');
  });
});

describe('hasAnyValue', () => {
  const update = partialOf(base).refine(hasAnyValue, 'empty_update');

  it('answers the empty-update issue for {}', () => {
    const result = update.safeParse({});
    expect(result.error?.issues.map((i) => i.message)).toEqual(['empty_update']);
  });

  it('answers it when a blank was turned into undefined', () => {
    const blankless = z.preprocess(
      (v) => ({ ...z.record(z.string(), z.unknown()).parse(v), name: undefined }),
      update,
    );
    expect(blankless.safeParse({ name: '' }).success).toBe(false);
  });

  it('accepts a body with one value', () => {
    expect(update.safeParse({ age: 4 }).success).toBe(true);
  });
});
