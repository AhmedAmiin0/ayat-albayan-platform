import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@ab/mobile-kit';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { HeldBell } from './HeldBell';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

const page = { items: [], total: 0, page: 1, pageSize: 20, unread: 0 };

function answer(permissions: string[]) {
  mockApi.onRead(async ({ path: p }) => (p === '/auth/me' ? { role: 'sales', permissions } : page));
}

beforeEach(() => jest.clearAllMocks());

test('without notifications.push there is no bell and no notifications read', async () => {
  answer(['inbox.read']);
  await renderWithQuery(<HeldBell tree="sales" />, createTestQueryClient({ meFromApi: true }));
  await waitFor(() => expect(mockApi.reads()).toContainEqual({ method: 'GET', path: '/auth/me' }));
  expect(screen.queryByRole('button', { name: t.bell.mobile.open })).toBeNull();
  expect(mockApi.reads()).not.toContainEqual({
    method: 'GET',
    path: '/me/notifications?page=1&pageSize=20',
  });
});

test('while /auth/me has not answered no bell flashes', async () => {
  mockApi.onRead(() => new Promise(() => undefined));
  await renderWithQuery(<HeldBell tree="assistant" />, createTestQueryClient({ meFromApi: true }));
  expect(screen.queryByRole('button', { name: t.bell.mobile.open })).toBeNull();
});

test.each([
  ['sales', '/sales/more/notifications'],
  ['assistant', '/assistant/more/notifications'],
] as const)('with notifications.push the %s bell opens %s', async (tree, href) => {
  answer(['notifications.push']);
  await renderWithQuery(<HeldBell tree={tree} />, createTestQueryClient({ meFromApi: true }));
  fireEvent.press(await screen.findByRole('button', { name: t.bell.mobile.open }));
  expect(router.push).toHaveBeenCalledWith(href);
});
