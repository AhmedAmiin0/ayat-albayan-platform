import { describe, expect, it } from 'vitest';
import { PROPOSAL_REQUESTERS, proposalRequesterSchema } from '../proposals';

describe('proposalRequesterSchema', () => {
  it('accepts the teacher and the family and nothing else', () => {
    expect(proposalRequesterSchema.options).toEqual([...PROPOSAL_REQUESTERS]);
    expect(proposalRequesterSchema.validate('admin')).toBe(false);
  });
});
