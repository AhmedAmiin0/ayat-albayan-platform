import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { PaidDayPicker } from './PaidDayPicker';

const m = t.payments.mobile;
const now = new Date('2026-10-28T09:00:00Z');

test('docs/07 «الأزرار»: «يوم قبله» | «يوم بعده» as one ButtonRow; today offers only the day before, full width', async () => {
  const onChange = jest.fn();
  const { rerender } = await render(<PaidDayPicker daysAgo={0} onChange={onChange} now={now} />);
  expect(screen.getAllByTestId('button-row-cell')).toHaveLength(1);
  expect(screen.queryByText(m.dayAfter)).toBeNull();
  await rerender(<PaidDayPicker daysAgo={2} onChange={onChange} now={now} />);
  const cells = screen.getAllByTestId('button-row-cell');
  expect(cells).toHaveLength(2);
  expect(within(cells[0] as (typeof cells)[number]).getByText(m.dayBefore)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: m.dayAfter }));
  expect(onChange).toHaveBeenCalledWith(1);
});
