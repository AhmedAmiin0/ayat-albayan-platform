import { toQueryString } from '@/core/lib/http/api';
import { DEFAULT_SELECTION, quoteParams } from './selection';

test('default: SA, 45 min, the popular standard package, 1 student, no discount', () => {
  expect(toQueryString(quoteParams(DEFAULT_SELECTION))).toBe(
    '?tier=standard&duration=45&country=SA&students=1&discount=0',
  );
});

test('«دولة أخرى (بالدولار)» leaves country out (country= would be a 400)', () => {
  const qs = toQueryString(quoteParams({ ...DEFAULT_SELECTION, country: 'other' }));
  expect(qs).not.toContain('country');
  expect(qs).toContain('tier=standard');
});

test('a custom count sends count and never tier (both → 400)', () => {
  const params = quoteParams({ ...DEFAULT_SELECTION, plan: 'custom', count: 28 });
  expect(params).toMatchObject({ count: 28, tier: undefined });
  expect(toQueryString(params)).toBe('?count=28&duration=45&country=SA&students=1&discount=0');
});

test('the free discount field is parsed like the site (Arabic digits, clamped to 0–100)', () => {
  const sent = (discount: string) => quoteParams({ ...DEFAULT_SELECTION, discount }).discount;
  expect(['١٢٫٥', '12.', '', '150'].map(sent)).toEqual([12.5, 12, 0, 100]);
});

test('a package ignores the custom count it remembers', () => {
  const params = quoteParams({ ...DEFAULT_SELECTION, plan: 'weekly', count: 40, discount: '15' });
  expect(toQueryString(params)).toBe('?tier=weekly&duration=45&country=SA&students=1&discount=15');
});
