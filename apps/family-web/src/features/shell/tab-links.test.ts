import { describe, expect, it } from 'vitest';
import { tabOf } from './tab-links';

describe('tabOf', () => {
  it.each([
    ['/portal', 'home'],
    ['/children/abc', 'home'],
    ['/schedule', 'schedule'],
    ['/reports', 'reports'],
    ['/report/r1', 'reports'],
    ['/account', 'account'],
    ['/alerts', null],
  ])('%s → %s', (path, tab) => {
    expect(tabOf(path)).toBe(tab);
  });
});
