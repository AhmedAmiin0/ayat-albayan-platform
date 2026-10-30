import { act, fireEvent, screen } from '@testing-library/react-native';
import { conflictLine } from '@/booking/shared/booking-errors';
import { setClockPref } from '@/core/lib/clock';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { EditTimeSheet } from './components/EditTimeSheet';
import { GRID, NOW, SAT_17, upcoming } from './testing/fixtures';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));

const clash = { kind: 'student_busy', startsAt: SAT_17, endsAt: '2026-10-03T14:45:00.000Z' } as const;

beforeEach(() => {
  mockApiFetch.mockReset().mockResolvedValue(GRID);
  mockApiSend.mockReset().mockRejectedValue(new ApiError(409, { code: 'conflict', conflicts: [clash] }));
  jest.useFakeTimers({ now: NOW, advanceTimers: true });
});
afterEach(() => jest.useRealTimers());

test('the clash line follows a 24 → 12 h switch of «تنسيق الوقت» without a remount', async () => {
  await act(async () => setClockPref('24'));
  const client = createTestQueryClient();
  client.setQueryData(['lessons', 'day', { date: '2026-10-01', tz: 'Asia/Riyadh' }], [upcoming]);
  await renderWithQuery(<EditTimeSheet lesson={upcoming} onClose={jest.fn()} />, client);
  await fireEvent.press(await screen.findByRole('radio', { name: '17:00' }));
  await fireEvent.press(screen.getByRole('button', { name: t.editTime.submit }));
  expect(await screen.findByText(conflictLine(clash, '24'))).toBeTruthy();

  await act(async () => setClockPref('12'));
  expect(screen.getByText(conflictLine(clash, '12'))).toBeTruthy();
  expect(screen.queryByText(conflictLine(clash, '24'))).toBeNull();
});
