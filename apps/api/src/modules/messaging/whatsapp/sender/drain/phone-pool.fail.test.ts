import { describe, expect, it, vi } from 'vitest';
import { allEnded, phonePool, type Step } from './phone-pool';

// Review of #695 (item 3): a thrown step never lets the pool settle while sibling rows run.

interface Row { id: string; phone: string }

describe('phonePool — a thrown step', () => {
  it('starts nothing more and rethrows only after the rows in flight ended', async () => {
    let release = (): void => undefined;
    const slow = new Promise<Step>((r) => { release = () => r('next'); });
    const steps: Record<string, () => Promise<Step>> = {
      a: () => slow, b: () => Promise.reject(new Error('boom')),
    };
    const step = vi.fn((row: Row): Promise<Step> => (steps[row.id] ?? (() => Promise.resolve('next')))());
    const items = [{ id: 'a', phone: '1' }, { id: 'b', phone: '2' }, { id: 'c', phone: '3' }, { id: 'd', phone: '4' }];
    let settled = false;
    const pool = phonePool({ items, size: 2, phoneOf: (r) => r.phone, step })
      .finally(() => { settled = true; });
    await vi.waitFor(() => expect(step).toHaveBeenCalledTimes(2));
    await new Promise((r) => setTimeout(r, 2));
    expect(settled).toBe(false);
    release();
    await expect(pool).rejects.toThrow('boom');
    expect(step.mock.calls.map(([r]) => r.id)).toEqual(['a', 'b']);
  });

  it('allEnded waits for every task and rethrows the first failure', async () => {
    const order: string[] = [];
    const late = new Promise<void>((r) => setTimeout(() => { order.push('late'); r(); }, 2));
    await expect(allEnded([Promise.reject(new Error('x')), late])).rejects.toThrow('x');
    expect(order).toEqual(['late']);
    await expect(allEnded([Promise.resolve(1)])).resolves.toBeUndefined();
  });
});
