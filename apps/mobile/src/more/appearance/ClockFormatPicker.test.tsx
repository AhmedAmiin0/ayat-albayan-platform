import { fireEvent, render, screen } from '@testing-library/react-native';
import { clockCycle, setClockPref } from '@/core/lib/clock';
import { t } from '@ab/mobile-kit';
import { ClockFormatPicker } from './ClockFormatPicker';

jest.mock('@ab/mobile-kit/lib/clock/device-clock', () => ({ deviceUses24: () => true }));

afterEach(() => setClockPref('auto'));

test('«تنسيق الوقت» offers the three choices and switches the clock at once', async () => {
  await render(<ClockFormatPicker />);
  expect(screen.getByRole('header', { name: t.clock.label })).toBeTruthy();
  expect(screen.getByRole('radio', { name: t.clock.auto, checked: true })).toBeTruthy();
  expect(clockCycle()).toBe('24');
  await fireEvent.press(screen.getByRole('radio', { name: t.clock.h12 }));
  expect(screen.getByRole('radio', { name: t.clock.h12, checked: true })).toBeTruthy();
  expect(clockCycle()).toBe('12');
  await fireEvent.press(screen.getByRole('radio', { name: t.clock.h24 }));
  expect(clockCycle()).toBe('24');
});
