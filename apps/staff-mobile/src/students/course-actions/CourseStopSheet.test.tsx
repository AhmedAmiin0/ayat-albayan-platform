import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError, t, pathKey } from '@ab/mobile-kit';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { CourseActionsSection } from './CourseActionsSection';
import { BASE, serve, stopPreview, SUB } from './fixtures';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (mockHref: unknown) => mockPush(mockHref) } }));

const s = t.courseActions.stop;

beforeEach(() => {
  mockApiFetch.mockReset().mockImplementation(serve());
  mockApiSend.mockReset();
});

const PHONE = '+201000000000';
const openSheet = async () => {
  await renderWithQuery(
    <CourseActionsSection studentId="s1" subscriptionId={SUB} chatPhone={PHONE} />,
  );
  await fireEvent.press(await screen.findByRole('button', { name: s.action }));
  await screen.findByRole('header', { name: s.title });
};

test('the sheet says what happens: 3 lessons, the schedule, money kept, history, «متوقف»', async () => {
  await openSheet();
  expect(await screen.findByText(s.lessons.few.replace('{n}', '3'))).toBeTruthy();
  expect(screen.getByText(s.schedule)).toBeTruthy();
  expect(screen.getByText(s.history)).toBeTruthy();
  expect(screen.getByText(s.status)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith(`${BASE}/course-stop?subscriptionId=${SUB}`);
});

test('the reason is required; sent trimmed with one request id, then the done block', async () => {
  mockApiSend.mockResolvedValue({ subscriptionId: SUB, cancelledLessons: 3, endedRules: 1, studentStatus: 'churned', stoppedAt: 'x' });
  await openSheet();
  await fireEvent.press(await screen.findByRole('button', { name: s.confirm }));
  expect(mockApiSend).not.toHaveBeenCalled();
  // The reason error shows only once confirm was pressed.
  expect(screen.getByText(s.reasonRequired)).toBeTruthy();
  await fireEvent.changeText(screen.getByPlaceholderText(s.reasonHint), '  سفر  ');
  await fireEvent.press(screen.getByRole('button', { name: s.confirm }));
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('POST', `${BASE}/course-stop`, {
      subscriptionId: SUB,
      reason: 'سفر',
      clientRequestId: expect.any(String),
      owe: { choice: 'attended' },
    }),
  );
  expect(await screen.findByText(s.done)).toBeTruthy();
  const status = s.doneStatus.replace('{status}', t.enums.studentStatus.churned);
  for (const line of [status, s.nextTitle, s.nextTell, s.notifiedFamily, s.notifiedTeacher])
    expect(screen.getByText(line)).toBeTruthy();
  expect(screen.queryByText(s.notifiedAdmins)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: s.close }));
  await waitFor(() => expect(screen.queryByRole('header', { name: s.title })).toBeNull());
  expect(screen.getByText(s.done)).toBeTruthy();
});

test('the done block opens the guardian\'s chat (the sheet closes first)', async () => {
  mockApiSend.mockResolvedValue({ subscriptionId: SUB, studentStatus: 'churned', refund: null });
  await openSheet();
  await fireEvent.changeText(await screen.findByPlaceholderText(s.reasonHint), 'سفر');
  await fireEvent.press(screen.getByRole('button', { name: s.confirm }));
  await fireEvent.press(await screen.findByRole('button', { name: t.students.family.openChat }));
  expect(mockPush).toHaveBeenCalledWith(`/inbox/thread/${encodeURIComponent(PHONE)}`);
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
