import { expect, it } from 'vitest';
import { searchStatus } from '../../index.js';

const W = { searching: 'S', empty: 'E', counter: '{n} من {m}', error: 'X' };
const at = (over: object) => ({ q: 'درس', searching: false, failed: false, total: 3, index: 1, ...over });

it('nothing asked, on its way, failed, no hit, then «N من M»', () => {
  expect(searchStatus(at({ q: '' }), W)).toBe('');
  expect(searchStatus(at({ searching: true }), W)).toBe('S');
  expect(searchStatus(at({ failed: true }), W)).toBe('X');
  expect(searchStatus(at({ total: 0 }), W)).toBe('E');
  expect(searchStatus(at({}), W)).toBe('2 من 3');
});
