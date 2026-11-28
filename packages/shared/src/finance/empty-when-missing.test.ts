import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { emptyWhenMissing } from './empty-when-missing';

describe('emptyWhenMissing', () => {
  const body = emptyWhenMissing(z.object({ note: z.string().optional() }));

  it('reads a missing or null body as an empty one', () => {
    expect(body.parse(undefined)).toEqual({});
    expect(body.parse(null)).toEqual({});
  });

  it('parses a sent body with the schema', () => {
    expect(body.parse({ note: 'n' })).toEqual({ note: 'n' });
    expect(body.safeParse({ note: 1 }).success).toBe(false);
  });
});
