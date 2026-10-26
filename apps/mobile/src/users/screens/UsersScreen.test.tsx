import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { ltr } from '@/core/ui/primitives/Ltr';
import { SARA, usersGet, YOUSEF } from '../shared/fixtures';
import { UsersScreen } from './UsersScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true } }));

const all = () => true;
const without = (key: string) => (p: string) => p !== key;

beforeEach(() => {
  mockApiFetch.mockReset();
  jest.mocked(router.push).mockReset();
});

test('rows in Arabic: name, role, linked record, status, LTR email and phone; 20 a page', async () => {
  mockApiFetch.mockImplementation(usersGet());
  await renderWithQuery(<UsersScreen can={all} />);
  expect(await screen.findByText('سارة أحمد')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/users?page=1&pageSize=20');
  expect(screen.getByRole('header', { name: t.users.title })).toBeTruthy();
  expect(screen.getByText(t.users.count.replace('{n}', '2'))).toBeTruthy();
  expect(screen.getByText(ltr('sara@ab.co'))).toBeTruthy();
  expect(screen.getByText(ltr('+966 55 123 4567'))).toBeTruthy();
  expect(screen.getByText(`${t.activity.roles.student}${t.common.listSeparator}يوسف علي ${ltr('AB-0007')}`)).toBeTruthy();
  expect(screen.getAllByText(t.users.status.disabled)).toHaveLength(2);
  await fireEvent.press(screen.getByRole('button', { name: new RegExp(YOUSEF.full_name) }));
  expect(router.push).toHaveBeenCalledWith('/more/users/u2');
});

test('search, role and status call GET /users with the same query as the web', async () => {
  mockApiFetch.mockImplementation(usersGet());
  await renderWithQuery(<UsersScreen can={all} />);
  await screen.findByText('سارة أحمد');
  await fireEvent.changeText(screen.getByLabelText(t.users.searchPlaceholder), ' sara ');
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/users?q=sara&page=1&pageSize=20'));
  await fireEvent.press(screen.getByRole('tab', { name: t.activity.roles.admin }));
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/users?q=sara&role=admin&page=1&pageSize=20'));
  await fireEvent.press(screen.getByRole('tab', { name: t.users.status.disabled }));
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/users?q=sara&role=admin&status=disabled&page=1&pageSize=20'));
});

test('the next page loads at the end of the list', async () => {
  mockApiFetch.mockImplementation(usersGet({ items: [SARA], total: 25 }));
  await renderWithQuery(<UsersScreen can={all} />);
  await screen.findByText('سارة أحمد');
  await fireEvent(screen.getByTestId('users-list'), 'onEndReached');
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/users?page=2&pageSize=20'));
});

test('«مستخدم جديد» opens the create form', async () => {
  mockApiFetch.mockImplementation(usersGet());
  await renderWithQuery(<UsersScreen can={all} />);
  await fireEvent.press(await screen.findByRole('button', { name: t.users.new }));
  expect(router.push).toHaveBeenCalledWith('/more/users/new');
});

test('without users.write there is no «مستخدم جديد»', async () => {
  mockApiFetch.mockImplementation(usersGet());
  await renderWithQuery(<UsersScreen can={without('users.write')} />);
  await screen.findByText('سارة أحمد');
  expect(screen.queryByRole('button', { name: t.users.new })).toBeNull();
});

test('an empty list says so in MSA', async () => {
  mockApiFetch.mockImplementation(usersGet({ items: [] }));
  await renderWithQuery(<UsersScreen can={all} />);
  expect(await screen.findByRole('header', { name: t.users.empty })).toBeTruthy();
});

test('a failed read offers a retry', async () => {
  mockApiFetch.mockImplementation(usersGet({ failList: true }));
  await renderWithQuery(<UsersScreen can={all} />);
  expect(await screen.findByText(t.common.error)).toBeTruthy();
  expect(screen.getByRole('button', { name: t.mobile.retry })).toBeTruthy();
});
