import { rowStyle } from './country-row.helpers';

test('a pressed row takes the press wash; at rest it is clear', () => {
  expect(rowStyle('wash')({ pressed: true }).backgroundColor).toBe('wash');
  expect(rowStyle('wash')({ pressed: false }).backgroundColor).toBe('transparent');
});
