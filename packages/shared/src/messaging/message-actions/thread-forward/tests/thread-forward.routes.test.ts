import { describe, expect, it } from 'vitest';
import { threadForwardRoutes as routes } from '..';

const ID = '00000000-0000-4000-8000-000000000001';
const REQ = '00000000-0000-4000-8000-000000000002';

describe('threadForwardRoutes', () => {
  it('keeps the path of today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual(['POST /threads/forward']);
  });

  it('takes the message, its targets and the request id', () => {
    const body = { messageId: ID, targets: ['+201000000001'], clientRequestId: REQ };
    expect(routes.forward.body.parse(body)).toEqual(body);
    expect(routes.forward.body.safeParse({ ...body, targets: [] }).success).toBe(false);
  });

  it('answers each target as sent with its message id, or skipped and why', () => {
    const answer = {
      results: [
        { phone: '+201000000001', sent: true, message_id: ID },
        { phone: '+201000000002', sent: false, reason: 'session_closed' },
      ],
    };
    expect(routes.forward.response.parse(answer)).toEqual(answer);
  });

  it('refuses an unknown skip reason and a sent copy with no id', () => {
    const bad = [
      { phone: '+201000000001', sent: false, reason: 'busy' },
      { phone: '+201000000001', sent: true },
    ];
    for (const r of bad) {
      expect(routes.forward.response.safeParse({ results: [r] }).success).toBe(false);
    }
  });

  it('never lets the internal replay flag reach the wire', () => {
    const replayed = { phone: '+201000000001', sent: true, message_id: ID, replayed: true };
    const { results } = routes.forward.response.parse({ results: [replayed] });
    expect(results[0]).not.toHaveProperty('replayed');
  });
});
