import { shape, space } from '@ab/catalog';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
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

const order = (word: string) => {
  const tree = JSON.stringify(screen.toJSON());
  return tree.indexOf('checkbox-box') < tree.indexOf(word) ? 'box-first' : 'box-last';
};

test('the box leads the row by default and trails it on side="end"', async () => {
  const row = (side?: 'start' | 'end') => (
    <Checkbox label="x" checked onChange={jest.fn()} side={side}>
      <Text>نص</Text>
    </Checkbox>
  );
  const { rerender } = await render(row());
  expect(order('نص')).toBe('box-first');
  await rerender(row('end'));
  expect(order('نص')).toBe('box-last');
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
