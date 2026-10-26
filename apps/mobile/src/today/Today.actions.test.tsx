import { fireEvent, screen, within } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { done, muscat, pending } from './testing/fixtures';
import { openSheet, openToday, inSheet } from './testing/today-sheet';

const summary = (n: number) =>
  t.today.summaryFilter.replace('{n}', String(n)).replace('{label}', t.today.summary.scheduled);

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));
// The bell reads its own API (notifications/BellButton.test); here it would take the day's mocked answers.
jest.mock('@/notifications/BellButton', () => ({ BellButton: () => null }));

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
  jest.useFakeTimers({ now: new Date('2026-10-01T13:20:00Z'), advanceTimers: true });
});
afterEach(() => jest.useRealTimers());


test('the hero’s «تأكيد الحلقة» shows «مؤكدة» before the server answers, then sends POST /lessons/:id/confirm', async () => {
  let resolve: (v: unknown) => void = () => undefined;
  mockApiSend.mockReturnValue(new Promise((r) => (resolve = r)));
  mockApiFetch.mockResolvedValue([done, pending, muscat]);
  await openToday();

  await fireEvent.press(screen.getByRole('button', { name: t.today.confirmLesson }));
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/lessons/l-pending/confirm', undefined);
  // The hero and the summary show it at once: none waits for confirmation now.
  expect(await screen.findByRole('button', { name: summary(0) })).toBeTruthy();
  expect(screen.getAllByText(t.enums.lessonStatus.confirmed)).toHaveLength(2);
  expect(screen.queryByRole('button', { name: t.today.confirmLesson })).toBeNull();

  mockApiFetch.mockResolvedValue([done, { ...pending, status: 'confirmed' }, muscat]);
  resolve({ ...pending, status: 'confirmed' });
  expect(await screen.findByText(t.lessons.confirmed)).toBeTruthy();
});

test('a refused confirm from the sheet rolls back to «يحتاج تأكيد» and says why there', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'invalid_transition', message: 'invalid_transition' }));
  mockApiFetch.mockResolvedValue([done, pending, muscat]);
  await openToday();
  await openSheet();

  await fireEvent.press(screen.getByRole('button', inSheet(t.today.confirm)));
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/lessons/l-pending/confirm', undefined);
  expect((await screen.findAllByText(t.lessons.invalidTransition)).length).toBeGreaterThan(0);
  expect(screen.getAllByText(t.enums.lessonStatus.scheduled).length).toBeGreaterThan(0);
  expect(screen.getByRole('button', inSheet(t.today.confirm))).toBeTruthy();
});

test('another failure gets the general error line', async () => {
  mockApiSend.mockRejectedValue(new ApiError(500));
  mockApiFetch.mockResolvedValue([pending]);
  await openToday();
  await fireEvent.press(screen.getByRole('button', { name: t.today.confirmLesson }));
  expect(await screen.findByText(t.common.error)).toBeTruthy();
});

test('إلغاء in the sheet asks scope, who and why; nothing is sent until who and why are given', async () => {
  mockApiFetch.mockResolvedValue([pending]);
  await openToday();
  await openSheet();
  await fireEvent.press(screen.getByRole('button', inSheet(t.today.cancel)));

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
  expect(screen.getByRole('button', inSheet(t.today.confirm))).toBeTruthy();
});
