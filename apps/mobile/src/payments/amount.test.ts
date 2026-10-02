import { parseAmount, westernDigits } from './amount';

test.each([
  ['145', 145],
  [' 72.5 ', 72.5],
  ['72.50', 72.5],
  ['١٤٥', 145],
  ['۱۴۵', 145],
  ['٧٢٫٥', 72.5],
  ['72,5', 72.5],
  ['0.01', 0.01],
])('«%s» → %d', (text, amount) => {
  expect(parseAmount(text)).toBe(amount);
});

test.each(['', ' ', '0', '0.00', '-5', 'abc', '1,500', '12.345', '1.2.3', '1e3', '.5', '5.'])(
  '«%s» is refused',
  (text) => {
    expect(parseAmount(text)).toBeNull();
  },
);

test('westernDigits keeps Western text as is', () => {
  expect(westernDigits('AB-12')).toBe('AB-12');
});
