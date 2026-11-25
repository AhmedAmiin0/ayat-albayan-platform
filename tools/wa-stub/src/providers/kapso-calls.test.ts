import { describe, expect, it } from 'vitest';
import { callValue } from './kapso-calls.ts';

const NOW = expect.stringMatching(/^\d+$/);

describe('wa-stub: callValue', () => {
  it('an inbound connect: from the peer, an sdp offer, only the fields given', () => {
    expect(callValue({ event: 'connect', callId: 'c1', peer: '2010', sdp: 'v=0' })).toStrictEqual({
      contacts: [{ wa_id: '2010', profile: { name: '' } }],
      calls: [
        {
          id: 'c1',
          event: 'connect',
          direction: 'USER_INITIATED',
          timestamp: NOW,
          from: '2010',
          session: { sdp_type: 'offer', sdp: 'v=0' },
        },
      ],
    });
  });

  it('an outbound terminate: to the peer, an sdp answer, status, duration 0 and ref kept', () => {
    const value = callValue({
      event: 'terminate',
      callId: 'c2',
      peer: '2011',
      direction: 'BUSINESS_INITIATED',
      sdp: 'v=1',
      status: 'Completed',
      duration: 0,
      ref: 'r1',
    });
    expect(value.calls).toStrictEqual([
      {
        id: 'c2',
        event: 'terminate',
        direction: 'BUSINESS_INITIATED',
        timestamp: NOW,
        to: '2011',
        session: { sdp_type: 'answer', sdp: 'v=1' },
        status: 'Completed',
        duration: 0,
        biz_opaque_callback_data: 'r1',
      },
    ]);
  });

  it('a status: RINGING by default, the ref only when given', () => {
    expect(callValue({ event: 'status', callId: 'c3', peer: '2012' })).toStrictEqual({
      statuses: [
        { id: 'c3', type: 'call', status: 'RINGING', timestamp: NOW, recipient_id: '2012' },
      ],
    });
    const withRef = callValue({
      event: 'status',
      callId: 'c4',
      peer: '2013',
      status: 'ACCEPTED',
      ref: 'r2',
    });
    expect(withRef.statuses).toStrictEqual([
      {
        id: 'c4',
        type: 'call',
        status: 'ACCEPTED',
        timestamp: NOW,
        recipient_id: '2013',
        biz_opaque_callback_data: 'r2',
      },
    ]);
  });
});
