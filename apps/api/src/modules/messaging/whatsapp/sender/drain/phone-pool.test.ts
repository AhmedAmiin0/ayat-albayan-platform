import { describe, expect, it } from 'vitest';
import { phonePool, type Step } from './phone-pool';

// docs/42 42-7: at most `size` at once, never two of one phone, each phone's rows in order.

interface Row { id: string; phone: string }
const rows = (spec: string): Row[] => spec.split(' ').map((p, i) => ({ id: `r${i}`, phone: p }));
const tick = () => new Promise<void>((r) => setTimeout(r, 1));

function recorder(stopAt?: { id: string; why: Step }) {
  const log: string[] = [];
  const live = new Map<string, number>();
  let peak = 0;
  const step = async (row: Row): Promise<Step> => {
    expect(live.get(row.phone) ?? 0).toBe(0); // never two of one phone at once
    live.set(row.phone, 1);
    peak = Math.max(peak, [...live.values()].reduce((a, b) => a + b, 0));
    log.push(row.id);
    await tick();
    live.set(row.phone, 0);
    return stopAt?.id === row.id ? stopAt.why : 'next';
  };
  return { log, step, peak: () => peak };
}

describe('phonePool', () => {
  it('size 1 keeps the queue order exactly (today\'s drain)', async () => {
    const r = recorder();
    await expect(phonePool({ items: rows('a b a c'), size: 1, phoneOf: (x) => x.phone, step: r.step })).resolves.toBeNull();
    expect(r.log).toEqual(['r0', 'r1', 'r2', 'r3']);
    expect(r.peak()).toBe(1);
  });

  it('size 3: phones in parallel, one phone\'s rows in order, never more than 3', async () => {
    const r = recorder();
    const items = rows('a a b c d a e');
    await phonePool({ items, size: 3, phoneOf: (x) => x.phone, step: r.step });
    expect(r.log.filter((id) => ['r0', 'r1', 'r5'].includes(id))).toEqual(['r0', 'r1', 'r5']);
    expect(r.log).toHaveLength(7);
    expect(r.peak()).toBeLessThanOrEqual(3);
    expect(r.peak()).toBeGreaterThan(1);
  });

  it('a stop ends the lane: why, the row, and the rows never started', async () => {
    const r = recorder({ id: 'r1', why: 'paused' });
    const stop = await phonePool({ items: rows('a b c d'), size: 1, phoneOf: (x) => x.phone, step: r.step });
    expect(stop).toMatchObject({ why: 'paused', item: { id: 'r1' } });
    expect(stop?.rest.map((x) => x.id)).toEqual(['r2', 'r3']);
    expect(r.log).toEqual(['r0', 'r1']);
  });

  it('a row waiting behind its phone does not start after the lane stopped', async () => {
    const r = recorder({ id: 'r0', why: 'closed' });
    const stop = await phonePool({ items: rows('a a b'), size: 3, phoneOf: (x) => x.phone, step: r.step });
    expect(stop?.why).toBe('closed');
    expect(r.log).not.toContain('r1');
    expect(stop?.rest.map((x) => x.id)).toContain('r1');
  });
});
