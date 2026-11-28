import { describe, expect, it } from 'vitest';
import { ApiError } from '../../../../core/http';
import { callSends } from '../calls-api';
import { callQueries } from '../calls.query-options';
import { ACTIVE, answering, ID, MESSAGE } from './calls.test-util';

describe('the call routes through their route objects', () => {
  it('sends each step of a call on the paths of today', async () => {
    const { api, apiSend } = answering(ACTIVE);
    const sends = callSends({ client: api, requestId: () => 'r1' });
    const start = { phone: '+966501234567', sdp: 'v=0', clientRequestId: ID };
    await expect(sends.startCall(start)).resolves.toEqual(ACTIVE);
    await sends.acceptCall(ID, 'v=0');
    await sends.rejectCall(ID);
    await sends.endCall(ID);
    expect(apiSend.mock.calls).toEqual([
      ['POST', '/calls', start],
      ['POST', `/calls/${ID}/accept`, { sdp: 'v=0' }],
      ['POST', `/calls/${ID}/reject`, undefined],
      ['POST', `/calls/${ID}/end`, undefined],
    ]);
  });

  it('asks a number for permission with one request id and reads the sent message', async () => {
    const { api, apiSend } = answering(MESSAGE);
    const sends = callSends({ client: api, requestId: () => 'r1' });
    await expect(sends.requestCallPermission('+966501234567')).resolves.toEqual(MESSAGE);
    expect(apiSend.mock.calls).toEqual([
      ['POST', '/calls/permission/%2B966501234567/request', { clientRequestId: 'r1' }],
    ]);
  });

  it('refuses an answer that is not a call instead of handing it on', async () => {
    const sends = callSends({ client: answering({ id: ID }).api, requestId: () => 'r1' });
    await expect(sends.endCall(ID)).rejects.toBeInstanceOf(ApiError);
    await expect(sends.requestCallPermission('+966501234567')).rejects.toBeInstanceOf(ApiError);
    const polls = callQueries(answering([{ ...ACTIVE, status: 'held' }]).api);
    const poll = polls.activeCallsQuery({ enabled: true, live: false });
    await expect(poll.queryFn()).rejects.toBeInstanceOf(ApiError);
  });
});
