import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t, listKey, ltr } from '@ab/mobile-kit';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { StudentsScreen } from './StudentsScreen';
import { listItem, page } from '@/students/shared/test-data';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (mockHref: string) => mockPush(mockHref) } }));

const rows = [
  listItem(),
  listItem({ id: 's2', code: 'AB-0184', name: 'يوسف', status: 'churned' }),
  listItem({ id: 's3', code: null, name: 'مريم', status: 'trial', teacher_name: 'أ. منى' }),
];

beforeEach(() => {
  mockApi.reset('read');
  mockPush.mockReset();
});

test('rows: name, LTR code, guardian, status word; «يحتاج معلم/ة» only on a live student without one', async () => {
  mockApi.onRead(() => page(rows));
  await renderWithQuery(<StudentsScreen />);
  expect(await screen.findByText('هدى')).toBeTruthy();
  expect(mockApi.reads()).toContainEqual({ method: 'GET', path: '/students?page=1&pageSize=25' });
  // The total sits on the title's line, with no separate count line.
  expect(screen.getByRole('header', { name: `${t.nav.students} · 3` })).toBeTruthy();
  expect(screen.queryByText(t.students.count.replace('{n}', '3'))).toBeNull();
  expect(screen.getByText(ltr('AB-0183'))).toBeTruthy();
  expect(screen.getAllByText('أم هدى')).toHaveLength(3);
  // The status pill and the row both say it.
  expect(screen.getAllByText(t.enums.studentStatus.churned)).toHaveLength(2);
  expect(screen.getAllByText(t.alerts.needsTeacher)).toHaveLength(1);
});

test('search goes to the server as ?search=', async () => {
  mockApi.onRead(() => page(rows));
  await renderWithQuery(<StudentsScreen />);
  await screen.findByText('هدى');
  mockApi.onRead(() => page([rows[1] ?? listItem()]));
  const field = screen.getByLabelText(t.students.searchPlaceholder);
  await fireEvent.changeText(field, ' 0552 ');
  await fireEvent(field, 'submitEditing');
  await waitFor(() =>
    expect(mockApi.reads().at(-1)).toEqual({
      method: 'GET',
      path: '/students?search=0552&page=1&pageSize=25',
    }),
  );
  expect(await screen.findByText('يوسف')).toBeTruthy();
  expect(screen.queryByText('هدى')).toBeNull();
});

test('a row opens the quick view', async () => {
  mockApi.onRead(() => page(rows));
  await renderWithQuery(<StudentsScreen />);
  await fireEvent.press(await screen.findByText('يوسف'));
  expect(mockPush).toHaveBeenCalledWith('/students/s2');
});

test('nothing yet: the students empty state', async () => {
  mockApi.onRead(() => page([]));
  await renderWithQuery(<StudentsScreen />);
  expect(await screen.findByRole('header', { name: t.students.empty })).toBeTruthy();
});

test('failed with nothing cached: error + retry', async () => {
  mockApi.onRead(() => Promise.reject(new Error('offline')));
  await renderWithQuery(<StudentsScreen />);
  expect(await screen.findByText(t.common.error)).toBeTruthy();
  mockApi.onRead(() => page(rows));
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  expect(await screen.findByText('هدى')).toBeTruthy();
});

test('offline with a cached list: rows stay, no error (R-MOB-03)', async () => {
  mockApi.onRead(() => Promise.reject(new Error('offline')));
  const client = createTestQueryClient();
  const key = listKey('/students', { search: '' });
  client.setQueryData(key, { pages: [page(rows)], pageParams: [1] });
  await renderWithQuery(<StudentsScreen />, client);
  await waitFor(() => expect(client.getQueryState(key)?.status).toBe('error'));
  expect(screen.getByText('هدى')).toBeTruthy();
  expect(screen.queryByText(t.common.error)).toBeNull();
});

test('an answer that is not a page of student rows shows the error, not a broken row', async () => {
  mockApi.onRead(() => ({ items: [{ id: 's1', name: 'هدى' }], total: 1, page: 1, pageSize: 25 }));
  await renderWithQuery(<StudentsScreen />);
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.queryByText('هدى')).toBeNull();
});
