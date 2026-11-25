import { describe, expect, it } from 'vitest';
import { testFlagBodySchema, testFlagResultSchema } from './test-accounts.schemas';

describe('test flag schemas', () => {
  it('takes a boolean is_test and nothing else', () => {
    expect(testFlagBodySchema.parse({ is_test: true })).toEqual({ is_test: true });
    expect(testFlagBodySchema.safeParse({ is_test: 'true' }).success).toBe(false);
    expect(testFlagBodySchema.safeParse({}).success).toBe(false);
    expect(testFlagBodySchema.safeParse({ is_test: true, role: 'admin' }).success).toBe(false);
  });

  it('answers the id and the stored flag', () => {
    const id = '0b6a0b8e-6d1a-4c3e-9a51-6f1c7f0a2b11';
    expect(testFlagResultSchema.parse({ id, is_test: false })).toEqual({ id, is_test: false });
    expect(testFlagResultSchema.safeParse({ id: 'x', is_test: false }).success).toBe(false);
  });
});
