import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { localDay } from '@/payments';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { CoursePauseSection } from './CoursePauseSection';
import { NOW, pauseResult, pauseState } from './fixtures';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));

const c = t.coursePause;
/** Not paused; the preview counts 3 lessons for an open-ended window, 2 once it ends. */
const serve = async (path: string) => {
  if (path === '/students/s1/course-pause') return pauseState();
  if (path.startsWith('/students/s1/course-pause/preview')) return { from_date: '2026-10-28', until_date: null, lessons: path.includes('until=') ? 2 : 3 };
  throw new ApiError(404);
};

beforeEach(() => {
  mockApiFetch.mockReset().mockImplementation(serve);
  mockApiSend.mockReset();
  fakeNow(NOW);
});
afterEach(() => jest.useRealTimers());

const openSheet = async () => {
  await renderWithQuery(<CoursePauseSection studentId="s1" />);
  await fireEvent.press(await screen.findByRole('button', { name: c.action }));
  await screen.findByRole('header', { name: c.title });
};

test('from today (never a day before), until off with its hint, the live count and the no-message note', async () => {
  await openSheet();
  expect(screen.getByText(localDay('2026-10-28'))).toBeTruthy();
  const before = screen.getByRole('button', { name: t.payments.mobile.dayBefore });
  expect(before.props.accessibilityState.disabled).toBe(true);
  expect(screen.getByText(c.untilHint)).toBeTruthy();
  expect(await screen.findByText(c.preview.few.replace('{n}', '3'))).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/students/s1/course-pause/preview?from=2026-10-28');
  expect(screen.getByText(c.noMessage)).toBeTruthy();
  expect(screen.getAllByRole('button', { name: c.confirm })).toHaveLength(1);
});

test('an end day recounts; the body carries from, until and the trimmed reason; then «أُوقفت الدورة مؤقتًا»', async () => {
  mockApiSend.mockResolvedValue(pauseResult());
  await openSheet();
  await fireEvent(screen.getByLabelText(c.until), 'valueChange', true);
  expect(await screen.findByText(c.preview.two)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/students/s1/course-pause/preview?from=2026-10-28&until=2026-11-03');
  await fireEvent.changeText(screen.getByPlaceholderText(c.reasonHint), '  سفر الأسرة ');
  await fireEvent.press(screen.getByRole('button', { name: c.confirm }));
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('POST', '/students/s1/course-pause', { fromDate: '2026-10-28', untilDate: '2026-11-03', reason: 'سفر الأسرة' }),
  );
  expect(await screen.findByText(c.done)).toBeTruthy();
  expect(screen.queryByRole('header', { name: c.title })).toBeNull();
});

test('a later start moves the window; no reason sends none; until off sends null', async () => {
  mockApiSend.mockResolvedValue(pauseResult());
  await openSheet();
  await fireEvent.press(screen.getByRole('button', { name: t.payments.mobile.dayAfter }));
  await fireEvent.press(screen.getByRole('button', { name: c.confirm }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/students/s1/course-pause', { fromDate: '2026-10-29', untilDate: null }));
});

test('a refused start says why and keeps the sheet open', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'already_paused' }));
  await openSheet();
  await fireEvent.press(screen.getByRole('button', { name: c.confirm }));
  expect(await screen.findByText(c.errors.already_paused)).toBeTruthy();
  expect(screen.getByRole('header', { name: c.title })).toBeTruthy();
});

test('«إلغاء» closes the sheet without a write', async () => {
  await openSheet();
  await fireEvent.press(screen.getByRole('button', { name: t.common.cancel }));
  expect(screen.queryByRole('header', { name: c.title })).toBeNull();
  expect(mockApiSend).not.toHaveBeenCalled();
});
