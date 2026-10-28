import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { palette } from '@/theme';
import { PicksList } from './PicksList';

const picks = ['2026-11-01T15:00:00.000Z', '2026-11-03T15:00:00.000Z'];

test('docs/07 «الأزرار»: each day\'s «احذف …» is a danger button in its own cell, not a shrink-wrapped ghost', async () => {
  const onRemove = jest.fn();
  await render(<PicksList picks={picks} tz="Asia/Riyadh" onRemove={onRemove} />);
  const cells = screen.getAllByTestId('pick-remove');
  expect(cells).toHaveLength(2);
  const first = within(cells[0] as (typeof cells)[number]).getByRole('button');
  expect(StyleSheet.flatten(first.props.style)).toMatchObject({ borderColor: palette.light.bad });
  await fireEvent.press(first);
  expect(onRemove).toHaveBeenCalledWith(picks[0]);
});

test('read-only (the review): no remove buttons', async () => {
  await render(<PicksList picks={picks} tz="Asia/Riyadh" />);
  expect(screen.queryAllByRole('button')).toHaveLength(0);
});
