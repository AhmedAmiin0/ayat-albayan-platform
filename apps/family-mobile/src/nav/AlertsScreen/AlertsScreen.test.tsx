import type { NotificationsPage } from '@ab/shared';
import { mockCall } from '@ab/testing/mock-call';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { AlertsScreen } from './AlertsScreen';

const mockSend = jest.fn(async (..._args: unknown[]) => ({}));
const mockPage: { current: NotificationsPage } = {
  current: { items: [], total: 0, page: 1, pageSize: 20, unread: 0 },
};
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
const mockApi = mockCall();
mockApi.onRead(() => mockPage.current);
mockApi.onWrite((request) => mockSend(request.method, request.path, request.body));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

const markAll = t.portal.app.alerts.markAll;
const show = () => renderWithQuery(<AlertsScreen />, freshQueryClient());
const withUnread = (unread: number): NotificationsPage => ({
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  unread,
});

beforeEach(() => jest.clearAllMocks());

test('unread alerts: «تعليم الكل كمقروء» marks every row read', async () => {
  mockPage.current = withUnread(2);
  await show();
  await fireEvent.press(await screen.findByRole('button', { name: markAll }));
  await waitFor(() => expect(mockSend).toHaveBeenCalledWith('POST', '/me/notifications/read', {}));
});

test('nothing unread: the empty note and no «mark all»', async () => {
  mockPage.current = withUnread(0);
  await show();
  expect(await screen.findByText(t.bell.empty)).toBeTruthy();
  expect(screen.queryByRole('button', { name: markAll })).toBeNull();
});
