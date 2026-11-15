import { insertToken } from './PlaceholderChips';

test('insertToken puts the placeholder at the cursor or over the selection, clamped to the text', () => {
  expect(insertToken({ text: 'أهلًا ', key: 'name', selection: { start: 6, end: 6 } })).toBe('أهلًا {name}');
  expect(insertToken({ text: 'أهلًا يا فلان', key: 'name', selection: { start: 9, end: 13 } })).toBe('أهلًا يا {name}');
  expect(insertToken({ text: 'معك', key: 'assistant', selection: { start: 99, end: 99 } })).toBe('معك{assistant}');
});
