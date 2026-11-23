import { describe, expect, it } from 'vitest';
import { queryStateOf } from '#/components/ui/display/query-state/index.ts';

const none = (list: readonly number[]): boolean => list.length === 0;

describe('queryStateOf', () => {
  it('is loading with no data and no error', () => {
    expect(queryStateOf({ data: undefined, isError: false })).toBe('loading');
  });

  it('is error when the read failed and nothing is cached', () => {
    expect(queryStateOf({ data: undefined, isError: true })).toBe('error');
  });

  it('keeps cached data when a background refetch fails', () => {
    expect(queryStateOf({ data: [1], isError: true }, none)).toBe('data');
  });

  it('is empty when the data matches isEmpty', () => {
    expect(queryStateOf({ data: [], isError: false }, none)).toBe('empty');
  });

  it('is data without an isEmpty test, even for an empty list', () => {
    expect(queryStateOf({ data: [], isError: false })).toBe('data');
  });
});
