import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { done, lesson, muscat, pending } from './fixtures';
import { TodayScreen } from './TodayScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));
// The «جلسات مباشرة» section repeats the live card; it has its own tests (src/live).
jest.mock('@/live/LiveSessions', () => ({ LiveSessions: () => null }));
// The bell reads its own API (notifications/BellButton.test); here it would take the day's mocked answers.
jest.mock('@/notifications/BellButton', () => ({ BellButton: () => null }));

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
  jest.useFakeTimers({ now: new Date('2026-10-01T13:20:00Z'), advanceTimers: true });
});
afterEach(() => jest.useRealTimers());

async function openToday() {
  await renderWithQuery(<TodayScreen />);
  await screen.findByText('يوسف أحمد');
}

test('تأكيد shows «مؤكدة» before the server answers, then sends POST /lessons/:id/confirm', async () => {
  let resolve: (v: unknown) => void = () => undefined;
  mockApiSend.mockReturnValue(new Promise((r) => (resolve = r)));
  mockApiFetch.mockResolvedValue([done, pending, muscat]);
  await openToday();

  await fireEvent.press(screen.getByRole('button', { name: t.today.confirm }));
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/lessons/l-pending/confirm', undefined);
  expect(await screen.findByRole('tab', { name: `${t.enums.lessonStatus.confirmed} 2` })).toBeTruthy();
  expect(screen.getAllByText(t.enums.lessonStatus.confirmed)).toHaveLength(2);
  expect(screen.queryByRole('button', { name: t.today.confirm })).toBeNull();

  mockApiFetch.mockResolvedValue([done, { ...pending, status: 'confirmed' }, muscat]);
  resolve({ ...pending, status: 'confirmed' });
  expect(await screen.findByText(t.lessons.confirmed)).toBeTruthy();
});

test('a refused confirm rolls back to «يحتاج تأكيد» and says why on that card', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'invalid_transition', message: 'invalid_transition' }));
  mockApiFetch.mockResolvedValue([done, pending, muscat]);
  await openToday();

  await fireEvent.press(screen.getByRole('button', { name: t.today.confirm }));
  expect(await screen.findByText(t.lessons.invalidTransition)).toBeTruthy();
  expect(screen.getByText(t.enums.lessonStatus.scheduled)).toBeTruthy();
  expect(screen.getByRole('button', { name: t.today.confirm })).toBeTruthy();
});

test('another failure gets the general error line', async () => {
  mockApiSend.mockRejectedValue(new ApiError(500));
  mockApiFetch.mockResolvedValue([pending]);
  await openToday();
  await fireEvent.press(screen.getByRole('button', { name: t.today.confirm }));
  expect(await screen.findByText(t.common.error)).toBeTruthy();
});

test('إلغاء asks scope, who and why; nothing is sent until who and why are given', async () => {
  mockApiFetch.mockResolvedValue([pending]);
  await openToday();
  await fireEvent.press(screen.getByRole('button', { name: t.today.cancel }));

  const scope = screen.getByLabelText(t.lessons.scopeLabel);
  expect(within(scope).getByRole('radio', { name: t.lessons.scope.one })).toBeChecked();
  const by = screen.getByLabelText(t.lessons.cancelBy);
  for (const who of ['teacher', 'admin', 'student'] as const) {
    expect(within(by).getByRole('radio', { name: t.lessons.by[who] })).not.toBeChecked();
  }
  await fireEvent.press(screen.getByRole('button', { name: t.lessons.cancelSubmit }));
  expect(screen.getByText(t.common.required)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByRole('button', { name: t.common.back }));
  expect(screen.queryByLabelText(t.lessons.cancelBy)).toBeNull();
  expect(screen.getByRole('button', { name: t.today.confirm })).toBeTruthy();
});

test('a series cancel by the student sends the body, the card leaves Today, and it is said', async () => {
  mockApiFetch.mockResolvedValueOnce([pending, muscat]).mockResolvedValue([muscat]);
  mockApiSend.mockResolvedValue([]);
  await openToday();
  const [cancelYusuf] = screen.getAllByRole('button', { name: t.today.cancel });
  if (!cancelYusuf) throw new Error('no إلغاء on the first card');
  await fireEvent.press(cancelYusuf);

  await fireEvent.press(screen.getByRole('radio', { name: t.lessons.scope.rule }));
  await fireEvent.press(screen.getByRole('radio', { name: t.lessons.by.student }));
  await fireEvent.changeText(screen.getByLabelText(t.lessons.reason), '  سفر  ');
  await fireEvent.press(screen.getByRole('button', { name: t.lessons.cancelSubmit }));

  expect(mockApiSend).toHaveBeenCalledWith('POST', '/lessons/l-pending/cancel', {
    scope: 'rule',
    by: 'student',
    reason: 'سفر',
  });
  await waitFor(() => expect(screen.queryByText('يوسف أحمد')).toBeNull());
  expect(await screen.findByText(t.lessons.seriesCancelled)).toBeTruthy();
  expect(screen.getByText('جنى وليد')).toBeTruthy();
});

test('a refused cancel brings the card back with its error', async () => {
  mockApiFetch.mockResolvedValue([pending]);
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'invalid_transition' }));
  await openToday();
  await fireEvent.press(screen.getByRole('button', { name: t.today.cancel }));
  await fireEvent.press(screen.getByRole('radio', { name: t.lessons.by.admin }));
  await fireEvent.changeText(screen.getByLabelText(t.lessons.reason), 'ظرف طارئ');
  await fireEvent.press(screen.getByRole('button', { name: t.lessons.cancelSubmit }));

  expect(await screen.findByText(t.lessons.invalidTransition)).toBeTruthy();
  expect(screen.getByText('يوسف أحمد')).toBeTruthy();
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/lessons/l-pending/cancel', {
    scope: 'one',
    by: 'admin',
    reason: 'ظرف طارئ',
  });
});

test('a lesson outside a series cannot cancel «كل اللي بعدها»', async () => {
  mockApiFetch.mockResolvedValue([lesson({ id: 'solo', rule_id: null })]);
  await openToday();
  await fireEvent.press(screen.getByRole('button', { name: t.today.cancel }));
  expect(screen.queryByLabelText(t.lessons.scopeLabel)).toBeNull();
  expect(screen.getByLabelText(t.lessons.cancelBy)).toBeTruthy();
});
