import { describe, expect, it } from 'vitest';
import { EvolutionPacer } from './evolution-pacer';

// docs/19 «Evolution driver»: a Baileys number keeps a gap between different recipients, and the
// pacer never sleeps (the sender reschedules the row instead).

function clock() {
  let t = 0;
  return { now: () => t, move: (ms: number) => (t += ms) };
}

const at = (key: string, to: string, gapMs = 3_000) => ({ key, to, gapMs });

describe('EvolutionPacer', () => {
  it('answers the wait before a different recipient; the same recipient goes at once', () => {
    const c = clock();
    const p = new EvolutionPacer(c);
    expect(p.waitMs(at('n1', '+1'))).toBe(0);
    p.mark(at('n1', '+1'));
    expect(p.waitMs(at('n1', '+1'))).toBe(0);
    expect(p.waitMs(at('n1', '+2'))).toBe(3_000);
    c.move(1_000);
    expect(p.waitMs(at('n1', '+2'))).toBe(2_000);
    c.move(2_500);
    expect(p.waitMs(at('n1', '+2'))).toBe(0);
  });

  it('only reads: asking twice takes no slot', () => {
    const p = new EvolutionPacer(clock());
    p.mark(at('n1', '+1'));
    expect(p.waitMs(at('n1', '+2'))).toBe(3_000);
    expect(p.waitMs(at('n1', '+3'))).toBe(3_000);
  });

  it('keeps numbers apart and a zero gap never waits', () => {
    const p = new EvolutionPacer(clock());
    p.mark(at('n1', '+1'));
    expect(p.waitMs(at('n2', '+2'))).toBe(0);
    p.mark(at('n3', '+1'));
    expect(p.waitMs(at('n3', '+2', 0))).toBe(0);
  });
});
