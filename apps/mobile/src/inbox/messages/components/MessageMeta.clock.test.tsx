import { act, render, screen } from '@testing-library/react-native';
import { setClockPref } from '@/core/lib/clock';
import { MessageMeta } from './MessageMeta';
import { inbound } from '../../shared/thread-fixtures';

// The bubble reads the device's zone (UTC under jest).

jest.mock('@/core/lib/clock/device-clock', () => ({ deviceUses24: () => true }));
afterEach(() => setClockPref('auto'));

test('a bubble’s time follows «تنسيق الوقت»: 14:30, then 2:30 م', async () => {
  await render(<MessageMeta message={{ ...inbound, created_at: '2026-10-02T14:30:00Z' }} />);
  expect(screen.getByText('14:30')).toBeTruthy();
  await act(async () => setClockPref('12'));
  expect(screen.getByText('2:30 م')).toBeTruthy();
});
