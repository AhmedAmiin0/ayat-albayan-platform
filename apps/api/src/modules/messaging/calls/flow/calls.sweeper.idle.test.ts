import { describe, expect, it, vi } from 'vitest';
import { FAMILY, LINE, fakeGate, fakeKit } from '../calls.fakes';
import { CallsSweeper, IDLE_MS } from './calls.sweeper';

vi.mock('../kapso/calling-line', () => ({ callingLine: vi.fn(() => LINE) }));

const T0 = Date.parse('2026-10-26T10:00:00.000Z');
const at = (ms: number) => new Date(T0 + ms);

/** A sweeper whose wa_calls reads are counted (each live() = one PostgREST round trip). */
function setup(on: boolean) {
  const { kit, queries } = fakeKit();
  const live = vi.spyOn(queries, 'live');
  return { sweeper: new CallsSweeper(kit, fakeGate({ on })), queries, live };
}

describe('CallsSweeper.tick — idle costs (owner 2026-10-27: wa_calls every 10 s while calls are OFF)', () => {
  it('calls OFF, nothing live: one sweep at boot, then no wa_calls read at all (was one every 10 s)', async () => {
    const { sweeper, live } = setup(false);
    for (let i = 0; i < 60; i += 1) await sweeper.tick(at(i * 10_000));
    expect(live).toHaveBeenCalledTimes(1);
  });

  it('calls OFF but a call left live: keeps sweeping every tick until it ends', async () => {
    const { sweeper, queries, live } = setup(false);
    await queries.insert({ direction: 'outbound', status: 'ringing', phone_e164: FAMILY, wa_call_id: 'w1', started_at: at(0).toISOString() });
    await sweeper.tick(at(10_000));
    await sweeper.tick(at(20_000));
    expect(await sweeper.tick(at(50_000))).toBe(1);
    await sweeper.tick(at(60_000));
    await sweeper.tick(at(70_000));
    expect(live).toHaveBeenCalledTimes(3);
  });

  it('calls ON and idle: one sweep per IDLE_MS (6 a minute → 1)', async () => {
    const { sweeper, live } = setup(true);
    for (let i = 0; i <= 12; i += 1) await sweeper.tick(at(i * 10_000));
    expect(live).toHaveBeenCalledTimes(1 + 120_000 / IDLE_MS);
  });

  it('a call inserted while idle is swept from the next 10 s tick, so the 45 s timeout is not delayed', async () => {
    const { sweeper, queries, live } = setup(true);
    await sweeper.tick(at(0));
    await queries.insert({ direction: 'outbound', status: 'ringing', phone_e164: FAMILY, wa_call_id: 'w2', started_at: at(1_000).toISOString() });
    await sweeper.tick(at(10_000));
    expect(live).toHaveBeenCalledTimes(2);
    expect(await sweeper.tick(at(50_000))).toBe(1);
  });

  it('a failed sweep or an unreadable setting sweeps again on the next tick', async () => {
    const { sweeper, live } = setup(true);
    live.mockRejectedValueOnce(new Error('db down'));
    await sweeper.tick(at(0));
    await sweeper.tick(at(10_000));
    expect(live).toHaveBeenCalledTimes(2);
    const { kit } = fakeKit();
    const broken = new CallsSweeper(kit, { enabled: () => Promise.reject(new Error('x')) } as never);
    const spy = vi.spyOn(kit.queries, 'live');
    await broken.tick(at(0));
    await broken.tick(at(IDLE_MS));
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
