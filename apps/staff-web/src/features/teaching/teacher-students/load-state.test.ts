import { describe, expect, it } from 'vitest';
import { loadState } from './load-state';

describe('loadState (docs/48 load-state order)', () => {
  it('data first, even when the last refetch failed', () => {
    expect(loadState({ data: [], isError: true })).toBe('ready');
    expect(loadState({ data: { id: 'x' }, isError: false })).toBe('ready');
  });

  it('an error only with nothing cached, else loading', () => {
    expect(loadState({ data: undefined, isError: true })).toBe('error');
    expect(loadState({ data: undefined, isError: false })).toBe('loading');
  });
});
