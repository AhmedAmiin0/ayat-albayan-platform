import { GRANTABLE_PERMISSIONS } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { localDay } from '@/payments';
import { fakeNow } from '@/test/fake-now';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { CoursePauseSection } from './CoursePauseSection';
import { NOW, pauseResult, pauseState, pauseView } from './fixtures';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));

const c = t.coursePause;
const paused = (open = pauseView()) => mockApiFetch.mockImplementation(async (path: string) => {
  if (path === '/students/s1/course-pause') return pauseState(open);
  throw new ApiError(404);
});

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
  fakeNow(NOW);
});
afterEach(() => jest.useRealTimers());

test('paused until a day: the title and the reason, no start line, no «إيقاف مؤقت»', async () => {
  paused();
  await renderWithQuery(<CoursePauseSection studentId="s1" />);
  expect(await screen.findByText(c.bannerUntil.replace('{date}', localDay('2026-11-10')))).toBeTruthy();
  expect(screen.getByText(c.bannerReason.replace('{reason}', 'سفر الأسرة'))).toBeTruthy();
  expect(screen.queryByText(c.bannerFrom, { exact: false })).toBeNull();
  expect(screen.queryByRole('button', { name: c.action })).toBeNull();
});

test('open-ended and starting later: «حتى الاستئناف» and «يبدأ الإيقاف في …»', async () => {
  paused(pauseView({ from_date: '2026-11-02', until_date: null, reason: null }));
  await renderWithQuery(<CoursePauseSection studentId="s1" />);
  expect(await screen.findByText(c.bannerOpen)).toBeTruthy();
  expect(screen.getByText(c.bannerFrom.replace('{date}', localDay('2026-11-02')))).toBeTruthy();
});

test('«استئناف» asks first; «استئناف الدورة» resumes and says how many lessons clash', async () => {
  paused();
  mockApiSend.mockResolvedValue(pauseResult({ conflicts: 2 }));
  await renderWithQuery(<CoursePauseSection studentId="s1" />);
  await fireEvent.press(await screen.findByRole('button', { name: c.resume }));
  expect(screen.getByText(`${c.resumeTitle} ${c.resumeBody}`)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: c.resumeConfirm }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/students/s1/course-pause/resume'));
  expect(await screen.findByText(c.resumedConflicts.replace('{n}', '2'))).toBeTruthy();
});

test('«رجوع» on the question leaves it paused; a failed resume says why', async () => {
  paused();
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'pause_not_open' }));
  await renderWithQuery(<CoursePauseSection studentId="s1" />);
  await fireEvent.press(await screen.findByRole('button', { name: c.resume }));
  await fireEvent.press(screen.getByRole('button', { name: t.common.back }));
  expect(screen.queryByRole('button', { name: c.resumeConfirm })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: c.resume }));
  await fireEvent.press(screen.getByRole('button', { name: c.resumeConfirm }));
  expect(await screen.findByText(c.errors.pause_not_open)).toBeTruthy();
});

test('«تغيير نهاية الإيقاف»: a day later, «حفظ» sends it; switched off sends null', async () => {
  paused();
  mockApiSend.mockResolvedValue(pauseResult());
  await renderWithQuery(<CoursePauseSection studentId="s1" />);
  await fireEvent.press(await screen.findByRole('button', { name: c.changeUntil }));
  expect(await screen.findByRole('header', { name: c.changeUntilTitle })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.payments.mobile.dayAfter }));
  await fireEvent.press(screen.getByRole('button', { name: c.save }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/students/s1/course-pause/until', { untilDate: '2026-11-11' }));
  expect(await screen.findByText(c.saved)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: c.changeUntil }));
  await fireEvent(await screen.findByLabelText(c.until), 'valueChange', false);
  await fireEvent.press(screen.getByRole('button', { name: c.save }));
  await waitFor(() => expect(mockApiSend).toHaveBeenLastCalledWith('PATCH', '/students/s1/course-pause/until', { untilDate: null }));
});

test('without courses.pause: the banner only, no resume or change, and no action when not paused', async () => {
  paused();
  const client = createTestQueryClient();
  client.setQueryData(pathKey('/auth/me'), { role: 'sales', permissions: GRANTABLE_PERMISSIONS.filter((p) => p !== 'courses.pause') });
  const view = await renderWithQuery(<CoursePauseSection studentId="s1" />, client);
  expect(await screen.findByText(c.bannerUntil.replace('{date}', localDay('2026-11-10')))).toBeTruthy();
  expect(screen.queryByRole('button', { name: c.resume })).toBeNull();
  expect(screen.queryByRole('button', { name: c.changeUntil })).toBeNull();
  await view.unmount();
  mockApiFetch.mockResolvedValue(pauseState());
  client.clear();
  client.setQueryData(pathKey('/auth/me'), { role: 'sales', permissions: [] });
  await renderWithQuery(<CoursePauseSection studentId="s1" />, client);
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(2));
  expect(screen.queryByRole('button', { name: c.action })).toBeNull();
});
