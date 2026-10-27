import { isolate, ltr } from './Ltr';

test('ltr() wraps a value in LRI … PDI, isolate() free text in FSI … PDI', () => {
  expect(ltr('AB-0183')).toBe('\u2066AB-0183\u2069');
  expect(isolate('أحمد')).toBe('\u2068أحمد\u2069');
});
