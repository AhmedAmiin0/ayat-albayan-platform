import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { listItem } from '@/students/test-data';
import { TeacherStudentsSection } from './TeacherStudentsSection';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (mockHref: string) => mockPush(mockHref) } }));

const L = t.studentLists;
const COUNTS = { new: 1, trial: 1, pending_subscription: 0, active: 2, pending_renewal: 1, expired: 1, paused: 1, churned: 0 };
const ROWS = {
  active: [listItem({ id: 's1', name: 'هدى' }), listItem({ id: 's2', name: 'يوسف' })],
  trial: [listItem({ id: 's3', name: 'مريم', status: 'trial' })],
  all: [listItem({ id: 's1', name: 'هدى' }), listItem({ id: 's4', name: 'سلمى', status: 'paused' })],
};
const page = (items: unknown[]) => ({ items, total: items.length, page: 1, pageSize: 50 });

function serve(rows = ROWS) {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('/students/status-counts')) return COUNTS;
    if (path.includes('status=active')) return page(rows.active);
    if (path.includes('status=new%2Ctrial%2Cpending_subscription')) return page(rows.trial);
    return page(rows.all);
  });
}
const tab = (label: string, n: number) => screen.getByRole('tab', { name: `${label} ${n}` });

beforeEach(() => {
  mockApiFetch.mockReset();
  mockPush.mockReset();
});

test('opens on «مشترك» with the API counts; «الكل» is every status', async () => {
  serve();
  await renderWithQuery(<TeacherStudentsSection teacherId="t1" />);
  expect(await screen.findByText('هدى')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/students?teacher=t1&status=active&page=1&pageSize=50');
  expect(mockApiFetch).toHaveBeenCalledWith('/students/status-counts?teacher=t1');
  expect(screen.getByRole('header', { name: L.section })).toBeTruthy();
  await waitFor(() => expect(tab(L.all, 7)).toBeTruthy());
  expect(tab(L.active, 2).props.accessibilityState).toMatchObject({ selected: true });
  expect(tab(L.trial, 2)).toBeTruthy(); // new + trial + pending_subscription
  expect(screen.queryByText('مريم')).toBeNull();
  await fireEvent.press(tab(L.all, 7));
  expect(await screen.findByText('سلمى')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/students?teacher=t1&page=1&pageSize=50');
});

test('the `status` param presets the switch; a row opens the student', async () => {
  serve();
  await renderWithQuery(<TeacherStudentsSection teacherId="t1" status="trial" />);
  await fireEvent.press(await screen.findByText('مريم'));
  expect(mockPush).toHaveBeenCalledWith('/students/s3');
  expect(screen.queryByText('هدى')).toBeNull();
  expect(mockApiFetch).toHaveBeenCalledWith('/students?teacher=t1&status=new%2Ctrial%2Cpending_subscription&page=1&pageSize=50');
});

test('a kind with nobody says so; an unknown status param falls back to «مشترك»', async () => {
  serve({ ...ROWS, active: [] });
  await renderWithQuery(<TeacherStudentsSection teacherId="t1" status="paused,churned" />);
  expect(await screen.findByText(L.emptyActive)).toBeTruthy();
});

test('a failed read shows the error with retry', async () => {
  mockApiFetch.mockRejectedValue(new Error('offline'));
  await renderWithQuery(<TeacherStudentsSection teacherId="t1" />);
  expect(await screen.findByRole('alert')).toBeTruthy();
});
