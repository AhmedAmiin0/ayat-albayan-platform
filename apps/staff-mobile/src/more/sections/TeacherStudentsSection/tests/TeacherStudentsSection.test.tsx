import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { listItem } from '@/students/shared/test-data';
import { TeacherStudentsSection } from '@/more/sections/TeacherStudentsSection/TeacherStudentsSection';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (mockHref: string) => mockPush(mockHref) } }));

const L = t.studentLists;
const COUNTS = {
  new: 1,
  trial: 1,
  pending_subscription: 0,
  active: 2,
  pending_renewal: 1,
  expired: 1,
  paused: 1,
  churned: 0,
};
const ROWS = {
  active: [listItem({ id: 's1', name: 'هدى' }), listItem({ id: 's2', name: 'يوسف' })],
  trial: [listItem({ id: 's3', name: 'مريم', status: 'trial' })],
  all: [
    listItem({ id: 's1', name: 'هدى' }),
    listItem({ id: 's4', name: 'سلمى', status: 'paused' }),
  ],
};
const page = (items: unknown[]) => ({ items, total: items.length, page: 1, pageSize: 50 });

function serve(rows = ROWS) {
  mockApi.onRead(async ({ path }) => {
    if (path.startsWith('/students/status-counts')) return COUNTS;
    if (path.includes('status=active')) return page(rows.active);
    if (path.includes('status=new%2Ctrial%2Cpending_subscription')) return page(rows.trial);
    return page(rows.all);
  });
}
const tab = (label: string, n: number) => screen.getByRole('tab', { name: `${label} ${n}` });

beforeEach(() => {
  mockApi.reset('read');
  mockPush.mockReset();
});

test('opens on «مشترك» with the API counts; «الكل» is every status', async () => {
  serve();
  await renderWithQuery(<TeacherStudentsSection teacherId="t1" />);
  expect(await screen.findByText('هدى')).toBeTruthy();
  expect(mockApi.reads()).toContainEqual({
    method: 'GET',
    path: '/students?teacher=t1&status=active&page=1&pageSize=50',
  });
  expect(mockApi.reads()).toContainEqual({
    method: 'GET',
    path: '/students/status-counts?teacher=t1',
  });
  expect(screen.getByRole('header', { name: L.section })).toBeTruthy();
  await waitFor(() => expect(tab(L.all, 7)).toBeTruthy());
  expect(tab(L.active, 2).props.accessibilityState).toMatchObject({ selected: true });
  expect(tab(L.trial, 2)).toBeTruthy(); // new + trial + pending_subscription
  expect(screen.queryByText('مريم')).toBeNull();
  await fireEvent.press(tab(L.all, 7));
  expect(await screen.findByText('سلمى')).toBeTruthy();
  expect(mockApi.reads()).toContainEqual({
    method: 'GET',
    path: '/students?teacher=t1&page=1&pageSize=50',
  });
});

test('the `status` param presets the switch; a row opens the student', async () => {
  serve();
  await renderWithQuery(<TeacherStudentsSection teacherId="t1" status="trial" />);
  await fireEvent.press(await screen.findByText('مريم'));
  expect(mockPush).toHaveBeenCalledWith('/students/s3');
  expect(screen.queryByText('هدى')).toBeNull();
  expect(mockApi.reads()).toContainEqual({
    method: 'GET',
    path: '/students?teacher=t1&status=new%2Ctrial%2Cpending_subscription&page=1&pageSize=50',
  });
});

test('a kind with nobody says so; an unknown status param falls back to «مشترك»', async () => {
  serve({ ...ROWS, active: [] });
  await renderWithQuery(<TeacherStudentsSection teacherId="t1" status="paused,churned" />);
  expect(await screen.findByText(L.emptyActive)).toBeTruthy();
});

test('a failed read shows the error with retry', async () => {
  mockApi.onRead(() => Promise.reject(new Error('offline')));
  await renderWithQuery(<TeacherStudentsSection teacherId="t1" />);
  expect(await screen.findByRole('alert')).toBeTruthy();
});
