import { describe, expect, it } from 'vitest';
import { refused } from '@/modules/messaging/inbox/send/refusal';

describe('refused', () => {
  it('is true for a pick that carries a code', () => {
    expect(refused({ code: 'session_closed' })).toBe(true);
  });

  it('is false for a line or number pick, and for an empty pick', () => {
    expect(refused({ line: 'chat', number_id: 'n1' })).toBe(false);
    expect(refused({})).toBe(false);
  });
});
