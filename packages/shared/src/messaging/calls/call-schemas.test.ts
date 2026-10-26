import { describe, expect, it } from 'vitest';
import { acceptCallSchema, CALL_SDP_MAX, callListQuerySchema, startCallSchema } from './call-schemas.js';

const id = '2f1c7c2e-5a55-4b7e-9d43-3d1f3a0b9c11';

describe('call request bodies', () => {
  it('a start needs an E.164 phone, an SDP and a request id', () => {
    expect(startCallSchema.safeParse({ phone: '+201001234567', sdp: 'v=0\r\n', clientRequestId: id }).success).toBe(true);
    expect(startCallSchema.safeParse({ phone: '+201001234567', sdp: 'v=0\r\n' }).success).toBe(false);
    expect(startCallSchema.safeParse({ phone: 'x', sdp: 'v=0\r\n', clientRequestId: id }).success).toBe(false);
  });

  it('an SDP starts with v=0 and stays under the cap', () => {
    expect(acceptCallSchema.safeParse({ sdp: 'hello' }).success).toBe(false);
    expect(acceptCallSchema.safeParse({ sdp: `v=0${'a'.repeat(CALL_SDP_MAX)}` }).success).toBe(false);
  });

  it('the log query defaults to 50', () => {
    expect(callListQuerySchema.parse({})).toEqual({ limit: 50 });
  });
});
