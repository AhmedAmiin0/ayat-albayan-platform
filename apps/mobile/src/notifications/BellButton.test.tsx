import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { BellButton } from './BellButton';

const mockApiFetch = jest.fn();
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (p: string) => mockApiFetch(p) }));

const page = (unread: number) => ({ items: [], total: 0, page: 1, pageSize: 20, unread });

beforeEach(() => jest.clearAllMocks());

test('no unread: plain name, no badge', async () => {
  mockApiFetch.mockResolvedValue(page(0));
  await renderWithQuery(<BellButton tree="admin" />);
  expect(await screen.findByRole('button', { name: t.bell.mobile.open })).toBeTruthy();
  expect(screen.queryByTestId('bell-badge')).toBeNull();
  expect(mockApiFetch).toHaveBeenCalledWith('/me/notifications?page=1&pageSize=20');
});

test('unread: the count in the name and on the badge, capped at «9+»', async () => {
  mockApiFetch.mockResolvedValue(page(14));
  await renderWithQuery(<BellButton tree="admin" />);
  const name = t.bell.mobile.openUnread.replace('{n}', '14');
  expect(await screen.findByRole('button', { name })).toBeTruthy();
  expect(screen.getByText('9+', { includeHiddenElements: true })).toBeTruthy();
});

test('a small count shows as is', async () => {
  mockApiFetch.mockResolvedValue(page(3));
  await renderWithQuery(<BellButton tree="teacher" />);
  expect(await screen.findByText('3', { includeHiddenElements: true })).toBeTruthy();
});

test.each([
  ['admin', '/more/notifications'],
  ['teacher', '/teacher/today/notifications'],
] as const)('in the %s tree it opens %s', async (tree, href) => {
  mockApiFetch.mockResolvedValue(page(0));
  await renderWithQuery(<BellButton tree={tree} />);
  fireEvent.press(await screen.findByRole('button', { name: t.bell.mobile.open }));
  expect(router.push).toHaveBeenCalledWith(href);
});
