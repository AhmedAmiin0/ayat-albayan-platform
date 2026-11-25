import { describe, expect, it } from 'vitest';
import { EVOLUTION_MODES, evolutionModeSchema } from '../keys';

describe('evolutionModeSchema', () => {
  it('accepts each Evolution engine and nothing else', () => {
    expect(evolutionModeSchema.options).toEqual([...EVOLUTION_MODES]);
    expect(evolutionModeSchema.validate('web')).toBe(false);
  });
});
