import { describe, expect, it, vi } from 'vitest';
import { callsKeys } from '../calls.keys';
import { ACTIVE_POLL_MS, callQueries, LIVE_POLL_MS } from '../calls.query-options';
import { answering, CALL } from './calls.test-util';

const { api: client, apiFetch: polled } = answering([]);

describe('activeCallsQuery (mobile: foreground only, docs/28 §9)', () => {
  const { activeCallsQuery } = callQueries(client);
  it('polls only while on (and in the foreground); faster during my call', () => {
    const interval = (input: Parameters<typeof activeCallsQuery>[0]) =>
      activeCallsQuery(input).refetchInterval;
    expect(interval({ enabled: true, live: false })).toBe(ACTIVE_POLL_MS);
    expect(interval({ enabled: true, live: true, polling: true })).toBe(LIVE_POLL_MS);
    expect(interval({ enabled: true, live: true, polling: false })).toBe(false);
    expect(interval({ enabled: false, live: false })).toBe(false);
    expect(activeCallsQuery({ enabled: false, live: false }).enabled).toBe(false);
  });

  it('stamps each poll with when it started', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(42);
    await expect(activeCallsQuery({ enabled: true, live: false }).queryFn()).resolves.toEqual({
      startedAt: 42,
      rows: [],
    });
    vi.restoreAllMocks();
  });
});

describe('the call routes', () => {
  it('reads one chat of the log by its encoded number', async () => {
    await callQueries(client).callListQuery({ enabled: true, phone: '+1' }).queryFn();
    expect(polled).toHaveBeenCalledWith('/calls?phone=%2B1&limit=50');
  });
});

describe('the calls queries', () => {
  it('keys each query from the calls key factory', () => {
    const queries = callQueries(client);
    expect(queries.callConfigQuery.queryKey).toEqual(callsKeys.config);
    expect(queries.activeCallsQuery({ enabled: true, live: false }).queryKey).toEqual(
      callsKeys.active,
    );
    expect(queries.callListQuery({ enabled: true, phone: null }).queryKey).toEqual(
      callsKeys.list(null),
    );
    expect(queries.callPermissionQuery('+1').queryKey).toEqual(callsKeys.permission('+1'));
  });

  it('polls the log only while calls are on', () => {
    const { callListQuery } = callQueries(client);
    expect(callListQuery({ enabled: true, phone: null }).refetchInterval).toBe(10_000);
    expect(callListQuery({ enabled: false, phone: null }).refetchInterval).toBe(false);
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
});
