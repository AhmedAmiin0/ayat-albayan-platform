import { shape, space } from '@ab/catalog';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { palette } from '../../../../theme';
import { Checkbox } from '../Checkbox';

const row = () => screen.getByRole('checkbox');

test('44 pt touch target, a logical row that mirrors in RTL', async () => {
  await render(<Checkbox label="x" checked={false} onChange={jest.fn()} />);
  expect(row()).toHaveStyle({
    minHeight: shape.control.touch,
    flexDirection: 'row',
    paddingHorizontal: 0,
  });
  expect(JSON.stringify(row().props.style)).not.toMatch(/left|right/i);
});

test('inset pads both edges of a full-width row', async () => {
  await render(<Checkbox label="x" checked={false} onChange={jest.fn()} inset />);
  expect(row()).toHaveStyle({ paddingHorizontal: space[4] });
});

test('the box leads the row by default and trails it on side="end"', async () => {
  const { rerender } = await render(<Checkbox label="x" checked onChange={jest.fn()} />);
  expect(row()).toHaveStyle({ flexDirection: 'row' });
  await rerender(<Checkbox label="x" checked onChange={jest.fn()} side="end" />);
  expect(row()).toHaveStyle({ flexDirection: 'row-reverse' });
});

test('the box takes the accent of the theme when checked, the input rule when not', async () => {
  const { rerender } = await render(<Checkbox label="x" checked onChange={jest.fn()} />);
  const box = () =>
    StyleSheet.flatten(
      screen.getByTestId('checkbox-box', { includeHiddenElements: true }).props.style,
    );
  expect(box().backgroundColor).toBe(palette.light.lapisFill);
  await rerender(<Checkbox label="x" checked={false} onChange={jest.fn()} />);
  expect(box().borderColor).toBe(palette.light.ruleInput);
});

test('the brand box draws the tick only when checked', async () => {
  const tick = () => screen.queryByTestId('checkbox-tick', { includeHiddenElements: true });
  const { rerender } = await render(<Checkbox label="x" checked onChange={jest.fn()} />);
  expect(tick()).not.toBeNull();
  await rerender(<Checkbox label="x" checked={false} onChange={jest.fn()} />);
  expect(tick()).toBeNull();
});
