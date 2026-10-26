import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { lesson, pending } from '@/today/testing/fixtures';
import { NOW, SAT_17, SLOTS } from './fixtures';
import { RescheduleSheet } from './RescheduleSheet';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));

const slotCalls = () =>
  mockApiFetch.mock.calls.filter(([path]: [string]) => path.startsWith('/booking/slots')).length;

beforeEach(() => {
  mockApiFetch.mockReset().mockResolvedValue(SLOTS);
  mockApiSend.mockReset();
  jest.useFakeTimers({ now: NOW, advanceTimers: true });
});
afterEach(() => jest.useRealTimers());

async function pickAndSubmit() {
  await renderWithQuery(<RescheduleSheet lesson={pending} onClose={jest.fn()} />);
  await fireEvent.press(await screen.findByRole('radio', { name: '17:00' }));
  await fireEvent.press(screen.getByRole('button', { name: t.lessons.rescheduleSubmit }));
}

test('409 conflict: the clash in Arabic, then «اختر موعدًا آخر» brings the slots back, fresh', async () => {
  mockApiSend.mockRejectedValue(
    new ApiError(409, {
      code: 'conflict',
      conflicts: [{ kind: 'teacher_busy', startsAt: SAT_17, endsAt: '2026-10-03T14:45:00.000Z' }],
    }),
  );
  await pickAndSubmit();
  expect(await screen.findByText(t.booking.conflictTitle)).toBeTruthy();
  expect(screen.getByText(t.booking.conflict.teacher_busy.replace('{when}', 'السبت 3 أكتوبر 17:00'))).toBeTruthy();
  expect(screen.queryByRole('radio', { name: '18:00' })).toBeNull();

  await fireEvent.press(screen.getByRole('button', { name: t.booking.changeSlot }));
  expect(await screen.findByRole('radio', { name: '18:00' })).toBeTruthy();
  expect(screen.queryByText(t.booking.conflictTitle)).toBeNull();
  expect(screen.getByText(t.lessons.newTimeHint)).toBeTruthy();
  await waitFor(() => expect(slotCalls()).toBe(2));
});

test('a refused move says why and keeps the pick for another try', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'invalid_transition' }));
  await pickAndSubmit();
  expect(await screen.findByText(t.lessons.error.invalid_transition)).toBeTruthy();
  expect(screen.getByRole('radio', { name: '17:00', checked: true })).toBeTruthy();
});

test('a series that ended cannot move as a whole: the API’s reason', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'rule_not_active' }));
  await renderWithQuery(<RescheduleSheet lesson={pending} onClose={jest.fn()} />);
  await fireEvent.press(await screen.findByRole('radio', { name: t.lessons.scope.rule }));
  await fireEvent.press(screen.getByRole('radio', { name: '17:00' }));
  await fireEvent.press(screen.getByRole('button', { name: t.lessons.rescheduleSubmit }));
  expect(await screen.findByText(t.lessons.error.rule_not_active)).toBeTruthy();
});

test('no free slot in two weeks: says so and points to the web', async () => {
  mockApiFetch.mockResolvedValue({ ...SLOTS, slots: [] });
  await renderWithQuery(<RescheduleSheet lesson={pending} onClose={jest.fn()} />);
  expect(await screen.findByText(t.reschedule.noSlots)).toBeTruthy();
});

test('slots failed to load: error and retry', async () => {
  mockApiFetch.mockRejectedValueOnce(new ApiError(500)).mockResolvedValue(SLOTS);
  await renderWithQuery(<RescheduleSheet lesson={pending} onClose={jest.fn()} />);
  expect(await screen.findByText(t.booking.slotsError)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  expect(await screen.findByRole('radio', { name: '17:00' })).toBeTruthy();
});

test('a length outside the bookable ones: moved from the web, no slots asked', async () => {
  const odd = lesson({ id: 'odd', ends_at: '2026-10-01T13:50:00.000Z' });
  await renderWithQuery(<RescheduleSheet lesson={odd} onClose={jest.fn()} />);
  expect(screen.getByText(t.reschedule.badDuration)).toBeTruthy();
  expect(mockApiFetch).not.toHaveBeenCalled();
});
