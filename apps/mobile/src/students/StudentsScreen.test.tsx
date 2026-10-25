import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { listKey } from '@/core/lib/query/query-keys';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { ltr } from '@/core/ui/primitives/Ltr';
import { StudentsScreen } from './StudentsScreen';
import { listItem, page } from './test-data';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (mockHref: string) => mockPush(mockHref) } }));

const rows = [
  listItem(),
  listItem({ id: 's2', code: 'AB-0184', name: 'يوسف', status: 'churned' }),
  listItem({ id: 's3', code: null, name: 'مريم', status: 'trial', teacher_name: 'أ. منى' }),
];

beforeEach(() => {
  mockApiFetch.mockReset();
  mockPush.mockReset();
});

test('rows: name, LTR code, guardian, status word; «يحتاج معلم/ة» only on a live student without one', async () => {
  mockApiFetch.mockResolvedValue(page(rows));
  await renderWithQuery(<StudentsScreen />);
  expect(await screen.findByText('هدى')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/students?page=1&pageSize=25');
  expect(screen.getByText(t.students.count.replace('{n}', '3'))).toBeTruthy();
  expect(screen.getByText(ltr('AB-0183'))).toBeTruthy();
  expect(screen.getAllByText('أم هدى')).toHaveLength(3);
  // The status pill and the row both say it.
  expect(screen.getAllByText(t.enums.studentStatus.churned)).toHaveLength(2);
  // هدى (active, no teacher) only: يوسف churned, مريم has a teacher.
  expect(screen.getAllByText(t.alerts.needsTeacher)).toHaveLength(1);
});

test('search goes to the server as ?search=', async () => {
  mockApiFetch.mockResolvedValue(page(rows));
  await renderWithQuery(<StudentsScreen />);
  await screen.findByText('هدى');
  mockApiFetch.mockResolvedValue(page([rows[1] ?? listItem()]));
  const field = screen.getByLabelText(t.students.searchPlaceholder);
  await fireEvent.changeText(field, ' 0552 ');
  await fireEvent(field, 'submitEditing');
  await waitFor(() =>
    expect(mockApiFetch).toHaveBeenLastCalledWith('/students?search=0552&page=1&pageSize=25'),
  );
  expect(await screen.findByText('يوسف')).toBeTruthy();
  expect(screen.queryByText('هدى')).toBeNull();
});

test('a row opens the quick view', async () => {
  mockApiFetch.mockResolvedValue(page(rows));
  await renderWithQuery(<StudentsScreen />);
  await fireEvent.press(await screen.findByText('يوسف'));
  expect(mockPush).toHaveBeenCalledWith('/students/s2');
});

test('nothing yet: the students empty state', async () => {
  mockApiFetch.mockResolvedValue(page([]));
  await renderWithQuery(<StudentsScreen />);
  expect(await screen.findByRole('header', { name: t.students.empty })).toBeTruthy();
});

test('failed with nothing cached: error + retry', async () => {
  mockApiFetch.mockRejectedValue(new Error('offline'));
  await renderWithQuery(<StudentsScreen />);
  expect(await screen.findByText(t.common.error)).toBeTruthy();
  mockApiFetch.mockResolvedValue(page(rows));
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  expect(await screen.findByText('هدى')).toBeTruthy();
});

test('offline with a cached list: rows stay, no error (R-MOB-03)', async () => {
  mockApiFetch.mockRejectedValue(new Error('offline'));
  const client = createTestQueryClient();
  const key = listKey('/students', { search: '' });
  client.setQueryData(key, { pages: [page(rows)], pageParams: [1] });
  await renderWithQuery(<StudentsScreen />, client);
  await waitFor(() => expect(client.getQueryState(key)?.status).toBe('error'));
  expect(screen.getByText('هدى')).toBeTruthy();
  expect(screen.queryByText(t.common.error)).toBeNull();
});
