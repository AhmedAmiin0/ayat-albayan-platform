import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../core/http';
import { ACTIVE_POLL_MS, callQueries, callSends, LIVE_POLL_MS } from './calls-api';

const client = { apiFetch: vi.fn(async () => []), apiSend: vi.fn(async () => undefined) } as unknown as ApiClient;

describe('activeCallsQuery (mobile: foreground only, docs/28 §9)', () => {
  const { activeCallsQuery } = callQueries(client);
  it('polls only while on (and in the foreground); faster during my call', () => {
    const interval = (input: Parameters<typeof activeCallsQuery>[0]) => activeCallsQuery(input).refetchInterval;
    expect(interval({ enabled: true, live: false })).toBe(ACTIVE_POLL_MS);
    expect(interval({ enabled: true, live: true, polling: true })).toBe(LIVE_POLL_MS);
    expect(interval({ enabled: true, live: true, polling: false })).toBe(false);
    expect(interval({ enabled: false, live: false })).toBe(false);
    expect(activeCallsQuery({ enabled: false, live: false }).enabled).toBe(false);
  });

  it('stamps each poll with when it started', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(42);
    await expect(activeCallsQuery({ enabled: true, live: false }).queryFn()).resolves.toEqual({ startedAt: 42, rows: [] });
    vi.restoreAllMocks();
  });
});

describe('the call routes', () => {
  it('reads one chat of the log by its encoded number', async () => {
    await callQueries(client).callListQuery({ enabled: true, phone: '+1' }).queryFn();
    expect(client.apiFetch).toHaveBeenCalledWith('/calls?phone=%2B1&limit=50');
  });
});

const ID = 'b1111111-1111-4111-8111-111111111111';
const AT = '2026-10-01T10:00:00+00:00';
const CALL = {
  id: ID,
  phone_e164: '+966501234567',
  direction: 'outbound',
  status: 'ringing',
  end_reason: null,
  display_name: null,
  staff_id: ID,
  started_at: AT,
  answered_at: null,
  ended_at: null,
  duration_seconds: null,
};
const ACTIVE = { ...CALL, offer_sdp: null, answer_sdp: null };
const MESSAGE = {
  id: ID,
  direction: 'outbound',
  status: 'queued',
  phone_e164: '+966501234567',
  lead_id: null,
  guardian_id: null,
  lesson_id: null,
  template_key: 'call_permission',
  template_params: null,
  body: null,
  media_mime: null,
  media_url: null,
  reply_to_wa_id: null,
  interactive_payload: null,
  error_code: null,
  error_text: null,
  attempts: 0,
  next_attempt_at: null,
  scheduled_for: null,
  sent_at: null,
  delivered_at: null,
  read_at: null,
  sent_manually_at: null,
  created_at: AT,
  click_to_chat: null,
  lesson: null,
};

const answering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const api: ApiClient = { apiFetch, apiSend };
  return { api, apiFetch, apiSend };
};

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

  it('asks a number for permission with one idempotency id and reads the sent message', async () => {
    const { api, apiSend } = answering(MESSAGE);
    const sends = callSends({ client: api, requestId: () => 'r1' });
    await expect(sends.requestCallPermission('+966501234567')).resolves.toEqual(MESSAGE);
    expect(apiSend.mock.calls).toEqual([
      ['POST', '/calls/permission/%2B966501234567/request', { clientRequestId: 'r1' }],
    ]);
  });

  it('reads the config, the log of one chat or of all, and a number permission', async () => {
    const { api, apiFetch } = answering([CALL]);
    const queries = callQueries(api);
    const all = queries.callListQuery({ enabled: true, phone: null });
    await expect(all.queryFn()).resolves.toEqual([CALL]);
    await queries.callListQuery({ enabled: true, phone: '+966501234567' }).queryFn();
    const permission = { state: 'granted', expires_at: null };
    apiFetch.mockResolvedValueOnce(permission);
    const asked = queries.callPermissionQuery('+966501234567');
    await expect(asked.queryFn()).resolves.toEqual(permission);
    const config = { enabled: false, available: false, canCall: false, iceServers: [] };
    apiFetch.mockResolvedValueOnce(config);
    await expect(queries.callConfigQuery.queryFn()).resolves.toEqual(config);
    expect(apiFetch.mock.calls).toEqual([
      ['/calls?limit=100'],
      ['/calls?phone=%2B966501234567&limit=50'],
      ['/calls/permission/%2B966501234567'],
      ['/calls/config'],
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
