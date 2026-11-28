import { describe, expect, it } from 'vitest';
import { listView, readView } from './wallet-view';

describe('wallet read views', () => {
  it('data wins, even after a failed refetch', () => {
    expect(readView({ data: {}, isError: true })).toBe('data');
  });

  it('no data: error, else loading', () => {
    expect(readView({ isError: true })).toBe('error');
    expect(readView({ isError: false })).toBe('loading');
  });

  it('the list shows rows first, then the read view', () => {
    expect(listView(2, { isError: true })).toBe('rows');
    expect(listView(0, { data: { items: [] }, isError: false })).toBe('data');
    expect(listView(0, { isError: true })).toBe('error');
    expect(listView(0, { isError: false })).toBe('loading');
  });
});
