import { whatsappLink } from './phone';

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
