import { highlightParts } from './highlight';

const bold = (text: string, query: string) =>
  highlightParts(text, query)
    .filter((p) => p.match)
    .map((p) => p.text);

test('no search: one plain run', () => {
  expect(highlightParts('السلام عليكم', '')).toEqual([{ text: 'السلام عليكم', match: false }]);
});

test('the typed letters are marked, every time they occur, the rest stays plain', () => {
  expect(highlightParts('الأسعار', 'سع')).toEqual([
    { text: 'الأ', match: false },
    { text: 'سع', match: true },
    { text: 'ار', match: false },
  ]);
  expect(bold('price and Price', 'price')).toEqual(['price', 'Price']);
});

test('Arabic letter forms and tashkeel are folded, the original characters kept', () => {
  expect(bold('أهلًا بك', 'اهلا')).toEqual(['أهلًا']);
  expect(bold('مدرسة', 'مدرسه')).toEqual(['مدرسة']);
});

test('runs of spaces fold to one, as the search does', () => {
  expect(bold('كيف   نخدمك', 'كيف نخدمك')).toEqual(['كيف   نخدمك']);
});

test('no match: one plain run', () => {
  expect(highlightParts('ترحيب', 'سع')).toEqual([{ text: 'ترحيب', match: false }]);
});
