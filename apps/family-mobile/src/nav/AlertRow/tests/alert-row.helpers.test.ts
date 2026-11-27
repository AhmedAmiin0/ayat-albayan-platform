import { rowStyle } from '@/nav/AlertRow/alert-row.helpers';

test('a pressed row takes the press fill; at rest, the unread wash or none', () => {
  expect(rowStyle('press', 'wash')({ pressed: true }).backgroundColor).toBe('press');
  expect(rowStyle('press', 'wash')({ pressed: false }).backgroundColor).toBe('wash');
  expect(rowStyle('press', undefined)({ pressed: false }).backgroundColor).toBeUndefined();
});
