import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { localDay } from '@/core/lib/money/format';
import { DatePickerField } from './DatePickerField';

const range = { min: '2026-09-15', max: '2026-11-02' };
const picker = () => screen.queryByTestId('native-date-time-picker');
interface PickerProps {
  mode: string;
  value: Date;
  minimumDate: Date;
  maximumDate: Date;
  presentation: string;
  onValueChange: (e: unknown, at: Date) => void;
  onDismiss: () => void;
}
const props = () => screen.getByTestId('native-date-time-picker').props as PickerProps;

async function open(day: string, onChange = jest.fn()) {
  await render(<DatePickerField label="تاريخ البدء" day={day} range={range} onChange={onChange} />);
  await fireEvent.press(screen.getByTestId('date-picker-open'));
  return onChange;
}

test('shows the day and the earliest allowed date; no dialog until tapped', async () => {
  await render(<DatePickerField label="تاريخ البدء" day="2026-10-20" range={range} onChange={jest.fn()} />);
  expect(screen.getByText(localDay('2026-10-20'))).toBeTruthy();
  expect(screen.getByText(t.datePicker.earliest.replace('{date}', localDay('2026-09-15')))).toBeTruthy();
  expect(picker()).toBeNull();
});

test('a tap opens Expo’s date dialog on the day, bounded by the range', async () => {
  await open('2026-10-20');
  const p = props();
  expect(p.mode).toBe('date');
  expect(p.presentation).toBe('dialog');
  expect([p.value.getFullYear(), p.value.getMonth(), p.value.getDate()]).toEqual([2026, 9, 20]);
  expect(p.minimumDate.getDate()).toBe(15);
  expect(p.maximumDate.getMonth()).toBe(10);
});

test('confirming sends YYYY-MM-DD and unmounts the dialog', async () => {
  const onChange = await open('2026-10-20');
  await act(() => props().onValueChange({}, new Date(2026, 9, 5, 0, 0)));
  expect(onChange).toHaveBeenCalledWith('2026-10-05');
  expect(picker()).toBeNull();
});

test('dismissing unmounts it without a change', async () => {
  const onChange = await open('2026-10-20');
  await act(() => props().onDismiss());
  expect(onChange).not.toHaveBeenCalled();
  expect(picker()).toBeNull();
});

test('empty: the placeholder, and the dialog opens on the first allowed day', async () => {
  await open('');
  expect(screen.getByText(t.lessonTimes.pickDate)).toBeTruthy();
  expect(props().value.getDate()).toBe(15);
});
