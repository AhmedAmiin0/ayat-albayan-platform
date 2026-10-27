import { act, render, screen } from '@testing-library/react-native';
import { setClockPref } from '@/core/lib/clock';
import { WeekdayRow } from './WeekdayRow';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
jest.mock('@/core/lib/clock/device-clock', () => ({ deviceUses24: () => false }));
afterEach(() => setClockPref('auto'));

const day = { weekday: 1, slots: [{ id: 's1', weekday: 1, start_time: '09:05', end_time: '12:00', tz: 'Asia/Riyadh' }] };

test('English: a 12-hour phone shows AM/PM; «24-hour» switches it back without a reload', async () => {
  await render(<WeekdayRow day={day} />);
  expect(screen.getByText('⁦9:05 AM – 12:00 PM⁩')).toBeTruthy();
  await act(async () => setClockPref('24'));
  expect(screen.getByText('⁦09:05 – 12:00⁩')).toBeTruthy();
});
