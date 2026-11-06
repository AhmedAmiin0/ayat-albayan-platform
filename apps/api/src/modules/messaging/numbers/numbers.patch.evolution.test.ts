import { describe, expect, it } from 'vitest';
import { numberRow } from './numbers.fakes';
import { numberPatch } from './numbers.patch';

// docs/19 «Evolution driver»: the engine follows the provider (migration 20261106000300).

const evo = numberRow({ provider: 'evolution', evolution_mode: 'baileys', waba_id: null });

describe('numberPatch and the Evolution engine', () => {
  it('leaving Evolution clears the engine; a non-Evolution row is left alone', () => {
    const patch = numberPatch(evo, { provider: 'meta' });
    expect(patch).toMatchObject({ provider: 'meta', evolution_mode: null });
    expect(numberPatch(numberRow(), { label: 'x' })).toEqual({ label: 'x' });
  });

  it('moving to Evolution without an engine is refused; with one it passes', () => {
    expect(() => numberPatch(numberRow(), { provider: 'evolution' })).toThrow();
    expect(numberPatch(numberRow(), { provider: 'evolution', evolution_mode: 'cloud' }))
      .toEqual({ provider: 'evolution', evolution_mode: 'cloud' });
    const auto = { evolution_auto_sends: true };
    expect(numberPatch(evo, auto)).toEqual(auto);
  });
});
