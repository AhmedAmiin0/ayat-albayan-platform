import type { NotificationItem, NotificationsPage } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { AlertSections } from './AlertSections';

const mockSend = jest.fn(async (..._args: unknown[]) => ({}));
jest.mock('expo-router', () => ({ router: { navigate: jest.fn(), push: jest.fn() } }));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: jest.fn(async () => ({})),
  apiSend: (...args: unknown[]) => mockSend(...args),
}));

const item = (over: Partial<NotificationItem> = {}): NotificationItem => ({
  id: 'n1',
  kind: 'lesson_cancelled',
  title: 'أُلغيت الحلقة',
  body: '',
  data: {},
  created_at: new Date().toISOString(),
  read_at: null,
  ...over,
});
const page = (items: NotificationItem[]): NotificationsPage => ({
  items,
  total: items.length,
  page: 1,
  pageSize: 20,
  unread: items.filter((i) => i.read_at === null).length,
});
const show = (p: NotificationsPage) =>
  renderWithQuery(<AlertSections page={p} />, freshQueryClient());
const unreadName = (title: string) => `${title}، ${t.bell.unread}`;

beforeEach(() => jest.clearAllMocks());

test('no alerts: the empty note', async () => {
  await show(page([]));
  expect(screen.getByText(t.bell.empty)).toBeTruthy();
});

test("today's unread alert under «اليوم»: a tap marks it read and opens its screen", async () => {
  await show(page([item()]));
  expect(screen.getByRole('header', { name: t.portal.app.alerts.today })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: unreadName('أُلغيت الحلقة') }));
  await waitFor(() =>
    expect(mockSend).toHaveBeenCalledWith('POST', '/me/notifications/read', { ids: ['n1'] }),
  );
  expect(router.navigate).toHaveBeenCalledTimes(1);
});

test('a read alert with nothing to open: no mark, no navigation', async () => {
  const read = item({ kind: 'report_sent', title: 'تقرير', read_at: new Date().toISOString() });
  await show(page([read]));
  await fireEvent.press(screen.getByRole('button', { name: 'تقرير' }));
  expect(mockSend).not.toHaveBeenCalled();
  expect(router.push).not.toHaveBeenCalled();
  expect(router.navigate).not.toHaveBeenCalled();
});
