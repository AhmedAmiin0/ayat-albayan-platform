import { amountText, wholeText } from './format';

test('EGP is «ج.م» with the isolated amount, other currencies use the site word', () => {
  expect(amountText(1234.5)).toBe('⁦1,234.5⁩ ج.م');
  expect(amountText(20, 'SAR')).toBe('⁦20⁩ ر.س');
  expect(amountText(5, 'GBP')).toContain('GBP');
});

test('cents are rounded to two places; whole units drop them; negatives keep the sign', () => {
  expect(amountText(10.456)).toContain('10.46');
  expect(wholeText(1288.6)).toBe('⁦1,289⁩ ج.م');
  expect(wholeText(-1288)).toBe('⁦-1,288⁩ ج.م');
});
