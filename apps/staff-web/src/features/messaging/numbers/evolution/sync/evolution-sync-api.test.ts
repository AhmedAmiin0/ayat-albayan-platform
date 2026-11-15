import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { evolutionErrorText } from './evolution-sync-api';

// Review fixes 9 and 13: a save that was not pushed says so; a refused value is not «unreachable»
// and carries Evolution's own words.

const e = t.numbers.evolution.errors;

describe('evolutionErrorText', () => {
  it('a refused value: its own words after ours', () => {
    const err = new ApiError(502, { code: 'evolution_rejected', detail: 'number is required' });
    expect(evolutionErrorText(err)).toBe(`${e.evolution_rejected} number is required`);
  });

  it('saved but not pushed: said first', () => {
    const err = new ApiError(502, { code: 'evolution_unreachable', saved: true });
    expect(evolutionErrorText(err)).toBe(`${e.savedNotPushed} ${e.evolution_unreachable}`);
    const conflict = new ApiError(409, { code: 'evolution_cloud_ids', saved: true });
    expect(evolutionErrorText(conflict)).toBe(`${e.savedNotPushed} ${e.evolution_cloud_ids}`);
  });

  it('anything else is said generically', () => {
    expect(evolutionErrorText(new ApiError(500, { code: 'boom' }))).toBe(e.generic);
    expect(evolutionErrorText(new Error('x'))).toBe(e.generic);
  });
});
