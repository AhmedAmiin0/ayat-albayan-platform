import { fireEvent, screen, waitFor } from '@testing-library/react-native';
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

const lessonsKey = ['lessons', 'day', { date: '2026-10-01', tz: 'Asia/Riyadh' }];

beforeEach(() => {
  mockApiFetch.mockReset().mockResolvedValue(GRID);
  mockApiSend.mockReset();
  jest.useFakeTimers({ now: NOW, advanceTimers: true });
});
afterEach(() => jest.useRealTimers());

async function pickAndSave() {
  const client = createTestQueryClient();
  client.setQueryData(lessonsKey, [upcoming]);
  await renderWithQuery(<EditTimeSheet lesson={upcoming} onClose={jest.fn()} />, client);
  await fireEvent.press(await screen.findByRole('radio', { name: '17:00' }));
  await fireEvent.press(screen.getByRole('button', { name: t.editTime.submit }));
  return client;
}

const slotCalls = () => mockApiFetch.mock.calls.filter(([p]: [string]) => p.startsWith('/booking/slots')).length;

test('409 conflict: the clash in Arabic, then «اختر موعدًا آخر» brings the slots back, fresh', async () => {
  mockApiSend.mockRejectedValue(
    new ApiError(409, {
      code: 'conflict',
      conflicts: [{ kind: 'student_busy', startsAt: SAT_17, endsAt: '2026-10-03T14:45:00.000Z' }],
    }),
  );
  await pickAndSave();
  expect(await screen.findByText(t.booking.conflictTitle)).toBeTruthy();
  expect(screen.getByText(t.booking.conflict.student_busy.replace('{when}', 'السبت 3 أكتوبر 17:00'))).toBeTruthy();
  expect(screen.queryByRole('radio', { name: '18:00' })).toBeNull();
  // Pressing the same save again would only repeat the 409: no save, no confirm, one way out.
  expect(screen.queryByRole('button', { name: t.editTime.submit })).toBeNull();
  expect(screen.queryByText(t.editTime.sameLesson)).toBeNull();

  await fireEvent.press(screen.getByRole('button', { name: t.booking.changeSlot }));
  expect(await screen.findByRole('radio', { name: '18:00' })).toBeTruthy();
  expect(screen.getByRole('button', { name: t.editTime.submit })).toBeTruthy();
  expect(screen.queryByText(t.booking.conflictTitle)).toBeNull();
  await waitFor(() => expect(slotCalls()).toBe(2));
});

test('stale_time: someone else changed the lesson; Today and the calendars refetch', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'stale_time', starts_at: SAT_17, ends_at: SAT_17 }));
  const client = await pickAndSave();
  expect(await screen.findByText(t.editTime.error.stale_time)).toBeTruthy();
  await waitFor(() => expect(client.getQueryState(lessonsKey)?.isInvalidated).toBe(true));
});

test.each([
  ['payout_locked', 409],
  ['time_edit_not_allowed', 409],
  ['date_in_past', 400],
])('%s: its own line, the pick stays for another try', async (code, status) => {
  mockApiSend.mockRejectedValue(new ApiError(status, { code }));
  await pickAndSave();
  const own: Record<string, string | undefined> = { ...t.lessons.error, ...t.editTime.error };
  expect(await screen.findByText(own[code] ?? '')).toBeTruthy();
  expect(screen.getByRole('radio', { name: '17:00', checked: true })).toBeTruthy();
});

test('an ordinary refusal does not refetch the lists', async () => {
  mockApiSend.mockRejectedValue(new ApiError(400, { code: 'date_in_past' }));
  const client = await pickAndSave();
  await screen.findByText(t.lessons.error.date_in_past);
  expect(client.getQueryState(lessonsKey)?.isInvalidated).toBe(false);
});

test('offline: says it is not sure the time changed, and a retry is allowed', async () => {
  mockApiSend.mockRejectedValueOnce(new TypeError('Network request failed'));
  await pickAndSave();
  expect(await screen.findByText(t.editTime.offline)).toBeTruthy();
  mockApiSend.mockResolvedValue({ lesson: upcoming, notified: 0, payout: 'none', pdf_refresh: false });
  await fireEvent.press(screen.getByRole('button', { name: t.editTime.submit }));
  expect(await screen.findByText(t.editTime.saved)).toBeTruthy();
});

test('slots failed to load: error and retry (nothing can be picked blind)', async () => {
  mockApiFetch.mockRejectedValueOnce(new ApiError(500)).mockResolvedValue(GRID);
  await renderWithQuery(<EditTimeSheet lesson={upcoming} onClose={jest.fn()} />);
  expect(await screen.findByText(t.booking.slotsError)).toBeTruthy();
  expect(screen.getByRole('button', { name: t.editTime.submit })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  expect(await screen.findByRole('radio', { name: '17:00' })).toBeTruthy();
});
