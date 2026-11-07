import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { setClockPref } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { TimePickerField } from './TimePickerField';

interface PickerProps {
  mode: string;
  value: Date;
  is24Hour: boolean;
  onValueChange: (e: unknown, at: Date) => void;
  onDismiss: () => void;
}
const props = () => screen.getByTestId('native-date-time-picker').props as PickerProps;
const picker = () => screen.queryByTestId('native-date-time-picker');

async function open(time: string, onChange = jest.fn()) {
  await render(<TimePickerField label={t.lessonTimes.time} time={time} onChange={onChange} />);
  await fireEvent.press(screen.getByTestId('time-picker-open'));
  return onChange;
}

test('opens Expo’s time dialog on the time, 24 h per «تنسيق الوقت»', async () => {
  setClockPref('24');
  await open('17:30');
  expect(props().mode).toBe('time');
  expect([props().value.getHours(), props().value.getMinutes()]).toEqual([17, 30]);
  expect(props().is24Hour).toBe(true);
});

test('12 h when the viewer chose it', async () => {
  setClockPref('12');
  await open('09:05');
  expect(props().is24Hour).toBe(false);
});

afterEach(() => setClockPref('24'));

test('confirming keeps the picked minute as HH:MM and unmounts', async () => {
  const onChange = await open('');
  expect(screen.getByText(t.lessonTimes.pickTime)).toBeTruthy();
  await act(() => props().onValueChange({}, new Date(2000, 0, 1, 18, 7)));
  expect(onChange).toHaveBeenCalledWith('18:07');
  expect(picker()).toBeNull();
});

test('dismissing changes nothing', async () => {
  const onChange = await open('17:30');
  await act(() => props().onDismiss());
  expect(onChange).not.toHaveBeenCalled();
  expect(picker()).toBeNull();
});
