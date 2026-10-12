import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { NotificationsScreen } from './NotificationsScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));

const B = t.bell.mobile;
const at = '2026-10-12T08:00:00.000Z';
const lead = { id: 'n1', kind: 'new_message', title: 'رسالة جديدة', body: 'أم سلمى', data: { phone: '+966552147730' }, created_at: at, read_at: null };
const student = { id: 'n2', kind: 'new_student', title: 'طالب جديد', body: 'يوسف', data: { kind: 'new_student', studentId: 's-1', lessonId: 'l1' }, created_at: at, read_at: at };
const page = (items: unknown[], unread: number) => ({ items, total: items.length, page: 1, pageSize: 20, unread });
const me = { role: 'admin' };

function serve(list: unknown) {
  mockApiFetch.mockImplementation(async (p: string) => (p === '/auth/me' ? me : list));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockApiSend.mockResolvedValue(undefined);
});

test('the list: each row with its title and body, unread ones marked', async () => {
  serve(page([lead, student], 1));
  await renderWithQuery(<NotificationsScreen tree="admin" />);
  expect(await screen.findByText('رسالة جديدة')).toBeTruthy();
  expect(screen.getByText('يوسف')).toBeTruthy();
  expect(screen.getByRole('header', { name: B.screenTitle })).toBeTruthy();
  expect(screen.getAllByText(B.unread)).toHaveLength(1);
});

test('tapping an unread row marks it read and opens its screen', async () => {
  serve(page([lead, student], 1));
  await renderWithQuery(<NotificationsScreen tree="admin" />);
  const row = await screen.findByText('رسالة جديدة');
  serve(page([{ ...lead, read_at: at }, student], 0)); // what the refetch after the POST reads
  fireEvent.press(row);
  expect(router.push).toHaveBeenCalledWith('/inbox/thread/%2B966552147730');
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/me/notifications/read', { ids: ['n1'] }));
  await waitFor(() => expect(screen.queryByText(B.unread)).toBeNull());
});

test('a read row opens without asking the API again; the teacher tree routes to her calendar', async () => {
  serve(page([student], 0));
  await renderWithQuery(<NotificationsScreen tree="teacher" />);
  fireEvent.press(await screen.findByText('طالب جديد'));
  expect(router.push).toHaveBeenCalledWith('/teacher/schedule');
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('«تحديد الكل كمقروء» while any is unread, then it goes', async () => {
  serve(page([lead, student], 3));
  await renderWithQuery(<NotificationsScreen tree="admin" />);
  const markAll = await screen.findByRole('button', { name: B.markAll });
  serve(page([lead, student].map((n) => ({ ...n, read_at: at })), 0));
  fireEvent.press(markAll);
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/me/notifications/read', {}));
  await waitFor(() => expect(screen.queryByRole('button', { name: B.markAll })).toBeNull());
});

test('nothing yet: the empty state and no «mark all»', async () => {
  serve(page([], 0));
  await renderWithQuery(<NotificationsScreen tree="admin" />);
  expect(await screen.findByText(B.empty)).toBeTruthy();
  expect(screen.queryByRole('button', { name: B.markAll })).toBeNull();
});

test('a failed read with nothing cached says so and retries', async () => {
  mockApiFetch.mockImplementation(async (p: string) => {
    if (p === '/auth/me') return me;
    throw new Error('offline');
  });
  await renderWithQuery(<NotificationsScreen tree="admin" />);
  expect(await screen.findByText(B.loadError)).toBeTruthy();
  serve(page([lead], 1));
  fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  expect(await screen.findByText('رسالة جديدة')).toBeTruthy();
});
