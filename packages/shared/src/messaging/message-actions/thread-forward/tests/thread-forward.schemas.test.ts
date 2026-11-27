import { describe, expect, it } from 'vitest';
import { FORWARD_MAX_TARGETS } from '../../../replies/reply-forward';
import { forwardSkipSchema, threadForwardSchema } from '..';

const ID = '00000000-0000-4000-8000-000000000001';
const REQ = '00000000-0000-4000-8000-000000000002';
const phones = (n: number) => Array.from({ length: n }, (_, i) => `+2010000000${i}`);

describe('threadForwardSchema', () => {
  it('takes one to five distinct E.164 targets', () => {
    for (const n of [1, FORWARD_MAX_TARGETS]) {
      const body = { messageId: ID, targets: phones(n), clientRequestId: REQ };
      expect(threadForwardSchema.safeParse(body).success).toBe(true);
    }
  });

  it('refuses none, six, a duplicate, a free-text number or no request id', () => {
    const bad = [
      { messageId: ID, targets: [], clientRequestId: REQ },
      { messageId: ID, targets: phones(6), clientRequestId: REQ },
      { messageId: ID, targets: ['+201000000001', '+201000000001'], clientRequestId: REQ },
      { messageId: ID, targets: ['01000000001'], clientRequestId: REQ },
      { messageId: ID, targets: phones(1) },
    ];
    for (const body of bad) expect(threadForwardSchema.safeParse(body).success).toBe(false);
  });
});

describe('forwardSkipSchema', () => {
  it('names the send path codes a target may be skipped for', () => {
    expect(forwardSkipSchema.options).toEqual([
      'session_closed',
      'not_your_thread',
      'own_thread_read_only',
      'line_not_configured',
      'files_forbidden',
      'send_failed',
    ]);
  });
});
