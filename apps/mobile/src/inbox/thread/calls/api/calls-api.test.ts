import { activeCallsQuery, ACTIVE_POLL_MS, LIVE_POLL_MS } from './calls-api';

describe('activeCallsQuery (foreground only, docs/28 §9)', () => {
  it('polls only while on and in the foreground; faster during my call', () => {
    const interval = (input: Parameters<typeof activeCallsQuery>[0]) => activeCallsQuery(input).refetchInterval;
    expect(interval({ enabled: true, live: false, polling: true })).toBe(ACTIVE_POLL_MS);
    expect(interval({ enabled: true, live: true, polling: true })).toBe(LIVE_POLL_MS);
    expect(interval({ enabled: true, live: true, polling: false })).toBe(false);
    expect(interval({ enabled: false, live: false, polling: true })).toBe(false);
    expect(activeCallsQuery({ enabled: false, live: false, polling: true }).enabled).toBe(false);
  });
});
