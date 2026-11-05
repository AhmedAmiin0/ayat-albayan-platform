import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { localDay } from '@/core/lib/money/format';
import { DatePickerField } from './DatePickerField';

const range = { min: '2026-09-15', max: '2026-11-02', today: '2026-11-02' };
const d = t.datePicker;
const stateOf = (day: string) =>
  screen.getByTestId(`calendar-day-${day}`).props.accessibilityState as Record<string, unknown>;

async function openOn(day: string, onChange = jest.fn()) {
  await render(<DatePickerField label="تاريخ البدء" day={day} range={range} onChange={onChange} />);
  await fireEvent.press(screen.getByTestId('date-picker-open'));
  return onChange;
}

test('shows the day and the earliest allowed date; the sheet is closed until tapped', async () => {
  await render(
    <DatePickerField label="تاريخ البدء" day="2026-10-20" range={range} onChange={jest.fn()} />,
  );
  expect(screen.getByText(localDay('2026-10-20'))).toBeTruthy();
  expect(screen.getByText(d.earliest.replace('{date}', localDay('2026-09-15')))).toBeTruthy();
  expect(screen.queryByTestId('date-picker-sheet')).toBeNull();
});

test('opens on the picked day’s month with it selected; picking a day sends YYYY-MM-DD and closes', async () => {
  const onChange = await openOn('2026-10-20');
  expect(screen.getByTestId('date-picker-sheet')).toBeTruthy();
  expect(stateOf('2026-10-20')).toMatchObject({ selected: true });
  await fireEvent.press(screen.getByTestId('calendar-day-2026-10-05'));
  expect(onChange).toHaveBeenCalledWith('2026-10-05');
  expect(screen.queryByTestId('date-picker-sheet')).toBeNull();
});

test('days outside min/max are disabled and cannot be picked', async () => {
  const onChange = await openOn('2026-11-01');
  expect(stateOf('2026-11-03')).toMatchObject({ disabled: true });
  expect(stateOf('2026-11-02')).toMatchObject({ disabled: false });
  await fireEvent.press(screen.getByTestId('calendar-day-2026-11-03'));
  expect(onChange).not.toHaveBeenCalled();
});

test('month arrows walk the months and stop at the range’s first and last month', async () => {
  await openOn('2026-11-01');
  expect(screen.getByRole('button', { name: t.mobileFinance.month.next, disabled: true })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.mobileFinance.month.prev }));
  expect(screen.getByTestId('calendar-day-2026-10-31')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.mobileFinance.month.prev }));
  expect(stateOf('2026-09-14')).toMatchObject({ disabled: true });
  expect(stateOf('2026-09-15')).toMatchObject({ disabled: false });
  expect(screen.getByRole('button', { name: t.mobileFinance.month.prev, disabled: true })).toBeTruthy();
});

test('a tap on the scrim closes without a change', async () => {
  const onChange = await openOn('2026-10-20');
  await fireEvent.press(screen.getByLabelText(t.common.cancel, { includeHiddenElements: true }));
  expect(screen.queryByTestId('date-picker-sheet')).toBeNull();
  expect(onChange).not.toHaveBeenCalled();
});

test('each day says its weekday; the academy today also says «اليوم»', async () => {
  await openOn('2026-10-20');
  const label = (day: string) => screen.getByTestId(`calendar-day-${day}`).props.accessibilityLabel as string;
  expect(label('2026-10-20')).toBe(`${t.enums.weekday['2']}، ${localDay('2026-10-20')}`);
  await fireEvent.press(screen.getByRole('button', { name: t.mobileFinance.month.next }));
  expect(label('2026-11-02')).toBe(`${t.enums.weekday['1']}، ${localDay('2026-11-02')}، ${t.mobile.today}`);
});
