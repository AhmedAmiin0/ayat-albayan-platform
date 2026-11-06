import { describe, expect, it } from 'vitest';
import { EvolutionPacer } from './evolution-pacer';

// docs/19 «Evolution driver»: a Baileys number waits a gap between different recipients.

function clock() {
  let t = 0;
  const slept: number[] = [];
  return {
    slept,
    now: () => t,
    sleep: (ms: number) => {
      slept.push(ms);
      t += ms;
      return Promise.resolve();
    },
  };
}

describe('EvolutionPacer', () => {
  it('waits the gap before a different recipient; the same recipient goes at once', async () => {
    const c = clock();
    const p = new EvolutionPacer(c);
    await p.turn('n1', { to: '+1', gapMs: 3_000 });
    await p.turn('n1', { to: '+1', gapMs: 3_000 });
    await p.turn('n1', { to: '+2', gapMs: 3_000 });
    expect(c.slept).toEqual([3_000]);
  });

  it('queues concurrent sends in order: none is dropped, each waits its turn', async () => {
    const c = clock();
    const p = new EvolutionPacer(c);
    const done: string[] = [];
    await Promise.all(['+1', '+2', '+3'].map((to) => p.turn('n1', { to, gapMs: 1_000 }).then(() => done.push(to))));
    expect(done).toEqual(['+1', '+2', '+3']);
    expect(c.slept).toEqual([1_000, 1_000]);
  });

  it('numbers are paced apart; a zero gap never waits', async () => {
    const c = clock();
    const p = new EvolutionPacer(c);
    await p.turn('n1', { to: '+1', gapMs: 3_000 });
    await p.turn('n2', { to: '+2', gapMs: 3_000 });
    await p.turn('n3', { to: '+1', gapMs: 0 });
    await p.turn('n3', { to: '+2', gapMs: 0 });
    expect(c.slept).toEqual([]);
  });
});
