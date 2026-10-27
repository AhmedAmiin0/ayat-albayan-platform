import { afterEach, describe, expect, it, vi } from 'vitest';
import { FAMILY, LINE, fakeKit } from '../calls.fakes';
import { CallsSweeper, IDLE_MS } from './calls.sweeper';

vi.mock('../kapso/calling-line', () => ({ callingLine: vi.fn(() => LINE) }));

const T0 = Date.parse('2026-10-26T10:00:00.000Z');
const at = (ms: number) => new Date(T0 + ms);

/** A sweeper whose wa_calls reads are counted (each live() = one PostgREST round trip). */
function setup() {
  const { kit, queries } = fakeKit();
  const live = vi.spyOn(queries, 'live');
  return { sweeper: new CallsSweeper(kit), queries, live };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('CallsSweeper.tick — idle costs', () => {
  it('nothing live: one sweep per IDLE_MS, calls ON or OFF (the backstop for a lost wake)', async () => {
    const { sweeper, live } = setup();
    for (let i = 0; i <= 12; i += 1) await sweeper.tick(at(i * 10_000));
    expect(live).toHaveBeenCalledTimes(1 + 120_000 / IDLE_MS);
  });

  it('a call left live: keeps sweeping every tick until it ends', async () => {
    const { sweeper, queries, live } = setup();
    await queries.insert({ direction: 'outbound', status: 'ringing', phone_e164: FAMILY, wa_call_id: 'w1', started_at: at(0).toISOString() });
    await sweeper.tick(at(10_000));
    await sweeper.tick(at(20_000));
    expect(await sweeper.tick(at(50_000))).toBe(1);
    await sweeper.tick(at(60_000));
    await sweeper.tick(at(70_000));
    expect(live).toHaveBeenCalledTimes(3);
  });

  it('a wake (an insert, on any API copy) sweeps from the next 10 s tick, so the 45 s timeout is not delayed', async () => {
    const { sweeper, queries, live } = setup();
    await sweeper.tick(at(0));
    await queries.insert({ direction: 'outbound', status: 'ringing', phone_e164: FAMILY, wa_call_id: 'w2', started_at: at(1_000).toISOString() });
    await sweeper.tick(at(10_000));
    expect(live).toHaveBeenCalledTimes(1);
    await sweeper.wake();
    await sweeper.tick(at(20_000));
    expect(live).toHaveBeenCalledTimes(2);
    expect(await sweeper.tick(at(50_000))).toBe(1);
  });

  it('a wake that lands while a sweep reads (the insert after its read) still sweeps on the next tick', async () => {
    const { sweeper, live } = setup();
    live.mockImplementationOnce(async () => (await sweeper.wake(), []));
    await sweeper.tick(at(0));
    await sweeper.tick(at(10_000));
    expect(live).toHaveBeenCalledTimes(2);
  });

  it('a failed sweep sweeps again on the next tick', async () => {
    const { sweeper, live } = setup();
    live.mockRejectedValueOnce(new Error('db down'));
    await sweeper.tick(at(0));
    await sweeper.tick(at(10_000));
    expect(live).toHaveBeenCalledTimes(2);
  });

  it('api copy: wake() goes to the worker (its kick route), never sweeps here', async () => {
    vi.stubEnv('APP_ROLE', 'api');
    vi.stubEnv('WORKER_URL', 'http://ayat-worker:3000');
    const urls: string[] = [];
    vi.stubGlobal('fetch', (url: string) => (urls.push(url), Promise.resolve(new Response(null, { status: 204 }))));
    const { sweeper, live } = setup();
    await sweeper.wake();
    expect(urls).toEqual(['http://ayat-worker:3000/internal/jobs/calls-sweeper/kick']);
    expect(live).not.toHaveBeenCalled();
  });
});
