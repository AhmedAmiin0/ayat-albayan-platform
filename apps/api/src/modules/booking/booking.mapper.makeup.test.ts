import { describe, expect, it } from 'vitest';
import { leadTarget, toBookingResult } from './booking.mapper';

const RPC = {
  rule_id: 'R1',
  student_ids: ['S1'],
  guardian_ids: ['G1'],
  lessons: [{ id: 'L1', starts_at: '2026-10-04 14:00:00+00', ends_at: '2026-10-04 14:45:00+00' }],
  message_ids: ['M1'],
};

describe('toBookingResult — invoice_id (migration 171)', () => {
  it('passes the stored invoice id through (zod would strip an unlisted key)', () => {
    expect(toBookingResult({ ...RPC, invoice_id: 'I1' }).invoice_id).toBe('I1');
  });

  it('a trial has none: null; an answer from before migration 171 still parses', () => {
    expect(toBookingResult({ ...RPC, invoice_id: null }).invoice_id).toBeNull();
    expect(toBookingResult(RPC).invoice_id).toBeNull();
  });
});

describe('leadTarget — a makeup (no package) never moves a lead', () => {
  it.each([
    ['new', 'trial', 'trial_booked'],
    ['new', '8', 'converted'],
    ['new', null, null],
    ['trial_done', null, null],
  ] as const)('%s + %s → %s', (status, pkg, expected) => {
    expect(leadTarget(status, pkg)).toBe(expected);
  });
});
