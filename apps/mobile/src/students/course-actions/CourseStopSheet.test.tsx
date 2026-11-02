import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { CourseActionsSection } from './CourseActionsSection';
import { BASE, serve, stopPreview, SUB } from './fixtures';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));

const s = t.courseActions.stop;

beforeEach(() => {
  mockApiFetch.mockReset().mockImplementation(serve());
  mockApiSend.mockReset();
});

const openSheet = async () => {
  await renderWithQuery(<CourseActionsSection studentId="s1" subscriptionId={SUB} />);
  await fireEvent.press(await screen.findByRole('button', { name: s.action }));
  await screen.findByRole('header', { name: s.title });
};

test('the sheet says what happens: 3 lessons, the schedule, money kept, history, «توقف»', async () => {
  await openSheet();
  expect(await screen.findByText(s.lessons.few.replace('{n}', '3'))).toBeTruthy();
  expect(screen.getByText(s.schedule)).toBeTruthy();
  expect(screen.getByText(s.history)).toBeTruthy();
  expect(screen.getByText(s.status)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith(`${BASE}/course-stop?subscriptionId=${SUB}`);
});

test('the reason is required; the stop sends it trimmed with one request id, then the notice', async () => {
  mockApiSend.mockResolvedValue({ subscriptionId: SUB, cancelledLessons: 3, endedRules: 1, studentStatus: 'churned', stoppedAt: 'x' });
  await openSheet();
  await fireEvent.press(await screen.findByRole('button', { name: s.confirm }));
  expect(mockApiSend).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByPlaceholderText(s.reasonHint), '  سفر  ');
  await fireEvent.press(screen.getByRole('button', { name: s.confirm }));
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('POST', `${BASE}/course-stop`, {
      subscriptionId: SUB,
      reason: 'سفر',
      clientRequestId: expect.any(String),
    }),
  );
  expect(await screen.findByText(s.done)).toBeTruthy();
});

test('a refused stop says why and keeps the sheet', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'already_cancelled' }));
  await openSheet();
  await fireEvent.changeText(await screen.findByPlaceholderText(s.reasonHint), 'سفر');
  await fireEvent.press(screen.getByRole('button', { name: s.confirm }));
  expect(await screen.findByText(t.courseActions.errors.already_cancelled)).toBeTruthy();
  expect(screen.getByRole('header', { name: s.title })).toBeTruthy();
});

test('a package already stopped shows when and why, no confirm', async () => {
  const stopped = { at: '2026-10-30T09:00:00Z', by: 'a1', reason: 'سفر' };
  mockApiFetch.mockImplementation(serve(stopPreview({ stopped })));
  await openSheet();
  expect(await screen.findByText(s.stoppedReason.replace('{reason}', 'سفر'))).toBeTruthy();
  expect(screen.queryByRole('button', { name: s.confirm })).toBeNull();
});

test('without the keys nothing shows', async () => {
  const client = createTestQueryClient();
  client.setQueryData(pathKey('/auth/me'), { role: 'sales', permissions: [] });
  await renderWithQuery(<CourseActionsSection studentId="s1" subscriptionId={SUB} />, client);
  expect(screen.queryByRole('button', { name: s.action })).toBeNull();
  expect(screen.queryByRole('button', { name: t.courseActions.teacher.action })).toBeNull();
  expect(screen.queryByRole('button', { name: t.courseActions.times.action })).toBeNull();
});

test('without a package id the stop preview names the current one, and the stop uses it', async () => {
  mockApiSend.mockResolvedValue({ subscriptionId: SUB, cancelledLessons: 3, endedRules: 1, studentStatus: 'churned', stoppedAt: 'x' });
  await renderWithQuery(<CourseActionsSection studentId="s1" subscriptionId={null} />);
  await fireEvent.press(await screen.findByRole('button', { name: s.action }));
  expect(mockApiFetch).toHaveBeenCalledWith(`${BASE}/course-stop`);
  await fireEvent.changeText(await screen.findByPlaceholderText(s.reasonHint), 'سفر');
  await fireEvent.press(screen.getByRole('button', { name: s.confirm }));
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('POST', `${BASE}/course-stop`, expect.objectContaining({ subscriptionId: SUB })),
  );
});

test('no current package (404 subscription_not_found): the section hides', async () => {
  mockApiFetch.mockRejectedValue(new ApiError(404, { code: 'subscription_not_found' }));
  await renderWithQuery(<CourseActionsSection studentId="s1" />);
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith(`${BASE}/course-stop`));
  expect(screen.queryByRole('button', { name: s.action })).toBeNull();
});
