import { describe, expect, it } from 'vitest';
import { testTargetSchema } from './test-accounts.schemas';

describe('testTargetSchema', () => {
  it('names the two rows a test flag can be on', () => {
    expect(testTargetSchema.options).toEqual(['student', 'profile']);
  });
});
