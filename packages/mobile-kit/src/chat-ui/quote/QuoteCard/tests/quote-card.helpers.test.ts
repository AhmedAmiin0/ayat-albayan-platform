import { quoteBox } from '../quote-card.helpers';

const wash = { rest: 'sunk', pressed: 'soft' };

test('the card keeps its bar colour and takes the wash only while pressed', () => {
  const box = quoteBox('lapis', wash);
  expect(box({ pressed: true })).toMatchObject({
    borderStartColor: 'lapis',
    backgroundColor: 'soft',
    borderStartWidth: 3,
  });
  expect(box({ pressed: false }).backgroundColor).toBe('sunk');
});
