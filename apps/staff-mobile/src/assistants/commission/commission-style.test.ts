import { commissionStatusStyle } from './commission-style';

test('earned is settled money; voided is struck in the danger tone (the web status.ts)', () => {
  expect(commissionStatusStyle).toEqual({ earned: { tone: 'ok', glyph: 'fill' }, voided: { tone: 'bad', glyph: 'struck' } });
});
