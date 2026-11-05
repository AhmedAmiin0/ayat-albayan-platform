import { checkCustomPrice } from './custom-price';

test('off: today’s body, whatever was typed', () => {
  expect(checkCustomPrice(false, 'abc')).toEqual({ ok: true, body: {} });
});

test('on: the typed price (Arabic digits and «٫» too) is the customPrice', () => {
  expect(checkCustomPrice(true, '150')).toEqual({ ok: true, body: { customPrice: 150 } });
  expect(checkCustomPrice(true, '١٥٠٫٥')).toEqual({ ok: true, body: { customPrice: 150.5 } });
});

test('on: zero, empty, letters or 3 decimals are refused', () => {
  for (const text of ['0', '', 'abc', '12.345', '-5']) {
    expect(checkCustomPrice(true, text)).toEqual({ ok: false });
  }
});
