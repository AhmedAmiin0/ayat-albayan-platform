import { formatPhoneDisplay, whatsappLink } from './phone';

test('wa.me link uses digits only', () => {
  expect(whatsappLink('+966552147730')).toBe('https://wa.me/966552147730');
});

test('prefilled Arabic text is URL-encoded', () => {
  const text = 'السلام عليكم يا أم يوسف';
  const url = whatsappLink('+201012345678', text);
  expect(url).toBe(`https://wa.me/201012345678?text=${encodeURIComponent(text)}`);
  expect(decodeURIComponent(url.split('?text=')[1] ?? '')).toBe(text);
});

test('empty text adds no query', () => {
  expect(whatsappLink('+966552147730', '')).toBe('https://wa.me/966552147730');
});

test('Saudi mobile groups 2-3-4 (the design example)', () => {
  expect(formatPhoneDisplay('+966552147730')).toBe('+966 55 214 7730');
});

test('Egyptian mobile groups 2-4-4', () => {
  expect(formatPhoneDisplay('+201012345678')).toBe('+20 10 1234 5678');
});

test('other countries and odd lengths stay as stored', () => {
  expect(formatPhoneDisplay('+96891234567')).toBe('+96891234567');
  expect(formatPhoneDisplay('+9665521477')).toBe('+9665521477');
  expect(formatPhoneDisplay('+2010123456789')).toBe('+2010123456789');
});
