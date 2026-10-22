import { describe, expect, it } from 'vitest';
import { activeList } from './active-list';

const LISTS = [
  { id: 'a', name: 'بانتظار الدفع', count: 2 },
  { id: 'b', name: 'تجريبي', count: 0 },
];

describe('activeList', () => {
  it('keeps a known list', () => {
    expect(activeList('b', LISTS)).toBe('b');
  });

  it('falls back to «الكل» for an unknown id once the lists are loaded', () => {
    expect(activeList('gone', LISTS)).toBeUndefined();
    expect(activeList('gone', [])).toBeUndefined();
  });

  it('keeps the id while the lists load, and «الكل» stays «الكل»', () => {
    expect(activeList('a', undefined)).toBe('a');
    expect(activeList(undefined, LISTS)).toBeUndefined();
  });
});
