import { describe, expect, it } from 'vitest';
import { integrationSourceSchema } from '../keys';

describe('integration source', () => {
  it('names the database, the server env or nowhere', () => {
    expect(integrationSourceSchema.options).toEqual(['db', 'env', 'unset']);
  });

  it('refuses any other source', () => {
    expect(integrationSourceSchema.safeParse('vault').success).toBe(false);
  });
});
