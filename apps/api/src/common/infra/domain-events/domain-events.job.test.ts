import { describe, expect, it, vi } from 'vitest';
import { DomainEventsJob } from './domain-events.job';
import { EVENT_HANDLER_MAP } from './event-handlers';
import type { EventTransport } from './event-transport.port';

const summary = { claimed: 0, done: 0, retried: 0, parked: 0 };

const fakeTransport = () => ({
  start: vi.fn<EventTransport['start']>(),
  stop: vi.fn<EventTransport['stop']>(() => Promise.resolve()),
  drainOnce: vi.fn<EventTransport['drainOnce']>(() => Promise.resolve(summary)),
});

describe('DomainEventsJob', () => {
  it('starts the configured transport with the handler map where jobs run', () => {
    vi.stubEnv('APP_ROLE', 'all');
    const transport = fakeTransport();
    new DomainEventsJob(transport, EVENT_HANDLER_MAP).onApplicationBootstrap();
    expect(transport.start).toHaveBeenCalledWith(EVENT_HANDLER_MAP);
    vi.unstubAllEnvs();
  });

  it('stops it on shutdown, waiting for the handler in flight', async () => {
    const transport = fakeTransport();
    await new DomainEventsJob(transport, EVENT_HANDLER_MAP).onModuleDestroy();
    expect(transport.stop).toHaveBeenCalledTimes(1);
  });

  it('a kick drains once now', async () => {
    vi.stubEnv('APP_ROLE', 'all');
    const transport = fakeTransport();
    await new DomainEventsJob(transport, EVENT_HANDLER_MAP).kick();
    expect(transport.drainOnce).toHaveBeenCalledTimes(1);
    vi.unstubAllEnvs();
  });
});

describe('EVENT_HANDLER_MAP', () => {
  it('has a handler for every catalogued kind; the probe does nothing', async () => {
    const event = {
      id: '7d3f6a52-8f4e-4c55-9f0e-5a2b1c3d4e5f',
      kind: 'events.probe' as const,
      payload: { probe_id: '0b6c1d2e-3f40-4a51-8b62-7c8d9e0f1a2b' },
      occurred_at: '2026-11-23T08:00:00+00:00',
    };
    await expect(EVENT_HANDLER_MAP['events.probe'](event)).resolves.toBeUndefined();
  });
});
