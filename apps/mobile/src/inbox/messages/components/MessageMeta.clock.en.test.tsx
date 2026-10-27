import { act, render, screen } from '@testing-library/react-native';
import { setClockPref } from '@/core/lib/clock';
import { MessageMeta } from './MessageMeta';
import { inbound } from '../../shared/thread-fixtures';

// The bubble reads the device's zone (UTC under jest).

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
jest.mock('@/core/lib/clock/device-clock', () => ({ deviceUses24: () => false }));

afterEach(() => setClockPref('auto'));

test('English: a 12-hour phone reads 2:30 PM; «24-hour» makes it 14:30', async () => {
  await render(<MessageMeta message={{ ...inbound, created_at: '2026-10-02T14:30:00Z' }} />);
  expect(screen.getByText('2:30 PM')).toBeTruthy();
  await act(async () => setClockPref('24'));
  expect(screen.getByText('14:30')).toBeTruthy();
});
