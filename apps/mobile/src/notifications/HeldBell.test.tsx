import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { HeldBell } from './HeldBell';

const mockApiFetch = jest.fn();
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiFetch: (p: string) => mockApiFetch(p) }));

const page = { items: [], total: 0, page: 1, pageSize: 20, unread: 0 };

function answer(permissions: string[]) {
  mockApiFetch.mockImplementation(async (p: string) => (p === '/auth/me' ? { role: 'sales', permissions } : page));
}

beforeEach(() => jest.clearAllMocks());

test('without notifications.push there is no bell and no notifications read', async () => {
  answer(['inbox.read']);
  await renderWithQuery(<HeldBell tree="sales" />);
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/auth/me'));
  expect(screen.queryByRole('button', { name: t.bell.mobile.open })).toBeNull();
  expect(mockApiFetch).not.toHaveBeenCalledWith('/me/notifications?page=1&pageSize=20');
});

test('while /auth/me has not answered no bell flashes', async () => {
  mockApiFetch.mockReturnValue(new Promise(() => undefined));
  await renderWithQuery(<HeldBell tree="assistant" />);
  expect(screen.queryByRole('button', { name: t.bell.mobile.open })).toBeNull();
});

test.each([
  ['sales', '/sales/more/notifications'],
  ['assistant', '/assistant/more/notifications'],
] as const)('with notifications.push the %s bell opens %s', async (tree, href) => {
  answer(['notifications.push']);
  await renderWithQuery(<HeldBell tree={tree} />);
  fireEvent.press(await screen.findByRole('button', { name: t.bell.mobile.open }));
  expect(router.push).toHaveBeenCalledWith(href);
});
