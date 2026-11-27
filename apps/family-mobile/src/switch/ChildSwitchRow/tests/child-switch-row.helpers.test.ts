import { rowStyle } from '@/switch/ChildSwitchRow/child-switch-row.helpers';

test('the row in view sits on the wash, pressed or not', () => {
  expect(rowStyle('wash', true)({ pressed: false }).backgroundColor).toBe('wash');
  expect(rowStyle('wash', true)({ pressed: true }).backgroundColor).toBe('wash');
});

test('another row takes the wash only while pressed', () => {
  expect(rowStyle('wash', false)({ pressed: true }).backgroundColor).toBe('wash');
  expect(rowStyle('wash', false)({ pressed: false }).backgroundColor).toBeUndefined();
});

test('every row keeps a 64 point target', () => {
  expect(rowStyle('wash', false)({ pressed: false }).minHeight).toBe(64);
});
