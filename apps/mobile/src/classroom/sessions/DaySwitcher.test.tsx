import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { DaySwitcher } from './DaySwitcher';

test('docs/07 «الأزرار»: previous | today | next as one ButtonRow, in that order', async () => {
  const onStep = jest.fn();
  await render(<DaySwitcher date="2026-10-03" isToday onStep={onStep} onToday={jest.fn()} />);
  const cells = screen.getAllByTestId('button-row-cell');
  const at = (label: string) => cells.findIndex((cell) => within(cell).queryByText(label) !== null);
  expect([at(t.schedule.prevDay), at(t.schedule.today), at(t.schedule.nextDay)]).toEqual([0, 1, 2]);
  expect(screen.getByRole('button', { name: t.schedule.today })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: t.schedule.nextDay }));
  expect(onStep).toHaveBeenCalledWith(1);
});
