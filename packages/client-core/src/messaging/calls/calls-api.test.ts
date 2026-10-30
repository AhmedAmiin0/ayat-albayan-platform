import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../core/http/index.js';
import { ACTIVE_POLL_MS, callQueries, callSends, LIVE_POLL_MS } from './calls-api.js';

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
  it('encodes the number and sends one idempotency id', async () => {
    const sends = callSends({ client, requestId: () => 'r1' });
    await sends.requestCallPermission('+966501234567');
    expect(client.apiSend).toHaveBeenCalledWith('POST', '/calls/permission/%2B966501234567/request', { clientRequestId: 'r1' });
    await callQueries(client).callListQuery({ enabled: true, phone: '+1' }).queryFn();
    expect(client.apiFetch).toHaveBeenCalledWith('/calls?phone=%2B1&limit=50');
  });
});
