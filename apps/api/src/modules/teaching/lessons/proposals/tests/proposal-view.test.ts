import { describe, expect, it } from 'vitest';
import { pendingProposal } from '@/modules/teaching/lessons/proposals/proposal-view';

const row = (status: 'pending' | 'rejected' | 'withdrawn', requested_by?: string) => ({
  id: `p-${status}`,
  proposed_starts_at: '2026-11-18 15:30:00+00',
  note: null,
  status,
  created_at: '2026-11-16 10:00:00+00',
  ...(requested_by ? { requested_by } : {}),
});

describe('pendingProposal: who asked (owner 2026-11-17)', () => {
  it("a family row says so; an older row without the column is the teacher's", () => {
    expect(pendingProposal([row('pending', 'family')])?.requested_by).toBe('family');
    expect(pendingProposal([row('pending')])?.requested_by).toBe('teacher');
    expect(pendingProposal([row('pending', 'odd')])?.requested_by).toBe('teacher');
  });

  it('a withdrawn or declined request is not pending; no rows → null', () => {
    expect(pendingProposal([row('withdrawn', 'family'), row('rejected', 'family')])).toBeNull();
    expect(pendingProposal(undefined)).toBeNull();
  });

  it('instants come back as ISO strings', () => {
    expect(pendingProposal([row('pending', 'family')])?.proposed_starts_at).toBe(
      '2026-11-18T15:30:00.000Z',
    );
  });
});
