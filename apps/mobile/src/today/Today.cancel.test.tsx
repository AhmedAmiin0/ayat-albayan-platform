import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { lesson, muscat, pending } from './testing/fixtures';
import { openSheet, openToday, inSheet } from './testing/today-sheet';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));
// The bell reads its own API (notifications/BellButton.test); here it would take the day's mocked answers.
jest.mock('@/notifications/BellButton', () => ({ BellButton: () => null }));
// The greeting's first name reads /me/profile (TodayHeader.test); here it would take the day's mocked answers.
jest.mock('@/account/hooks/queries', () => ({
  ...jest.requireActual('@/account/hooks/queries'),
  useMyProfile: () => ({ data: undefined }),
}));

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
  jest.useFakeTimers({ now: new Date('2026-10-01T13:20:00Z'), advanceTimers: true });
});
afterEach(() => jest.useRealTimers());

test('a series cancel by the student sends the body, the lesson leaves Today, and it is said', async () => {
  mockApiFetch.mockResolvedValueOnce([pending, muscat]).mockResolvedValue([muscat]);
  mockApiSend.mockResolvedValue([]);
  await openToday();
  await openSheet();
  await fireEvent.press(screen.getByRole('button', inSheet(t.today.cancel)));

  await fireEvent.press(screen.getByRole('radio', { name: t.lessons.scope.rule }));
  await fireEvent.press(screen.getByRole('radio', { name: t.lessons.by.student }));
  await fireEvent.changeText(screen.getByLabelText(t.lessons.reason), '  سفر  ');
  await fireEvent.press(screen.getByRole('button', { name: t.lessons.cancelSubmit }));

  expect(mockApiSend).toHaveBeenCalledWith('POST', '/lessons/l-pending/cancel', {
    scope: 'rule',
    by: 'student',
    reason: 'سفر',
  });
  expect(await screen.findByText(t.lessons.seriesCancelled)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.common.close }));
  await waitFor(() => expect(screen.queryByText('يوسف أحمد')).toBeNull());
  expect(screen.getByText('جنى وليد')).toBeTruthy();
});

test('a refused cancel brings the lesson back with its error', async () => {
  mockApiFetch.mockResolvedValue([pending]);
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'invalid_transition' }));
  await openToday();
  await openSheet();
  await fireEvent.press(screen.getByRole('button', inSheet(t.today.cancel)));
  await fireEvent.press(screen.getByRole('radio', { name: t.lessons.by.admin }));
  await fireEvent.changeText(screen.getByLabelText(t.lessons.reason), 'ظرف طارئ');
  await fireEvent.press(screen.getByRole('button', { name: t.lessons.cancelSubmit }));

  expect((await screen.findAllByText(t.lessons.invalidTransition)).length).toBeGreaterThan(0);
  expect(screen.getAllByText('يوسف أحمد').length).toBeGreaterThan(0);
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/lessons/l-pending/cancel', {
    scope: 'one',
    by: 'admin',
    reason: 'ظرف طارئ',
  });
});

test('a lesson outside a series cannot cancel «كل اللي بعدها»', async () => {
  mockApiFetch.mockResolvedValue([lesson({ id: 'solo', rule_id: null })]);
  await openToday();
  await openSheet();
  await fireEvent.press(screen.getByRole('button', inSheet(t.today.cancel)));
  expect(screen.queryByLabelText(t.lessons.scopeLabel)).toBeNull();
  expect(screen.getByLabelText(t.lessons.cancelBy)).toBeTruthy();
});
