import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import { freshQueryClient, renderWithQuery } from '../../../testing/query';
import { BellButton } from '../BellButton';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('../../../lib/http/api', () => ({
  ...jest.requireActual('../../../lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

const page = (unread: number) => ({ items: [], total: 0, page: 1, pageSize: 20, unread });
const bell = (onPress = jest.fn()) =>
  renderWithQuery(<BellButton onPress={onPress} />, freshQueryClient());

beforeEach(() => jest.clearAllMocks());

test('no unread: plain name, no badge', async () => {
  mockApi.onRead(() => page(0));
  await bell();
  expect(await screen.findByRole('button', { name: t.bell.mobile.open })).toBeTruthy();
  expect(screen.queryByTestId('bell-badge')).toBeNull();
  expect(mockApi.reads()).toContainEqual({
    method: 'GET',
    path: '/me/notifications?page=1&pageSize=20',
  });
});

test('unread: the count in the name and on the badge, capped at «9+»', async () => {
  mockApi.onRead(() => page(14));
  await bell();
  const name = t.bell.mobile.openUnread.replace('{n}', '14');
  expect(await screen.findByRole('button', { name })).toBeTruthy();
  expect(screen.getByText('9+', { includeHiddenElements: true })).toBeTruthy();
});

test('a small count shows as is', async () => {
  mockApi.onRead(() => page(3));
  await bell();
  expect(await screen.findByText('3', { includeHiddenElements: true })).toBeTruthy();
});

test('a press calls onPress (the app routes it)', async () => {
  mockApi.onRead(() => page(0));
  const onPress = jest.fn();
  await bell(onPress);
  await fireEvent.press(await screen.findByRole('button', { name: t.bell.mobile.open }));
  expect(onPress).toHaveBeenCalledTimes(1);
});
