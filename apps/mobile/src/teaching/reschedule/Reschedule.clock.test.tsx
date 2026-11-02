import { act, fireEvent, screen } from '@testing-library/react-native';
import { conflictLine } from '@/booking/shared/booking-errors';
import { setClockPref } from '@/core/lib/clock';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { pending } from '@/today/testing/fixtures';
import { NOW, SAT_17, SLOTS } from './fixtures';
import { RescheduleSheet } from './RescheduleSheet';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));

const clash = { kind: 'teacher_busy', startsAt: SAT_17, endsAt: '2026-10-03T14:45:00.000Z' } as const;

beforeEach(() => {
  mockApiFetch.mockReset().mockResolvedValue(SLOTS);
  mockApiSend.mockReset().mockRejectedValue(new ApiError(409, { code: 'conflict', conflicts: [clash] }));
  jest.useFakeTimers({ now: NOW, advanceTimers: true });
});
afterEach(() => jest.useRealTimers());

test('the clash line follows a 24 → 12 h switch of «تنسيق الوقت» without a remount', async () => {
  await act(async () => setClockPref('24'));
  await renderWithQuery(<RescheduleSheet lesson={pending} onClose={jest.fn()} />);
  await fireEvent.press(await screen.findByRole('radio', { name: '17:00' }));
  await fireEvent.press(screen.getByRole('button', { name: t.lessons.rescheduleSubmit }));
  expect(await screen.findByText(conflictLine(clash, '24', 'Asia/Riyadh'))).toBeTruthy();

  await act(async () => setClockPref('12'));
  expect(screen.getByText(conflictLine(clash, '12', 'Asia/Riyadh'))).toBeTruthy();
  expect(screen.queryByText(conflictLine(clash, '24', 'Asia/Riyadh'))).toBeNull();
});
