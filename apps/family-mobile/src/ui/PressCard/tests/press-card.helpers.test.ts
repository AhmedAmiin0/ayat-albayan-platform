import { cardStyle } from '@/ui/PressCard/press-card.helpers';

const color = { raised: 'raised', rule: 'rule', lapisWash: 'wash' };

test('the lapis wash only while pressed', () => {
  const style = cardStyle(color);
  expect(style({ pressed: true }).backgroundColor).toBe('wash');
  expect(style({ pressed: false }).backgroundColor).toBe('raised');
});

test("the card's own layout wins over the defaults", () => {
  const style = cardStyle(color, { padding: 8, flexDirection: 'row' });
  expect(style({ pressed: false })).toMatchObject({ padding: 8, gap: 12 });
});
