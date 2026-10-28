import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { TeachersScreen } from './TeachersScreen';
import type { TeacherListItem } from '../types';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const teacher = (id: string, over: Partial<TeacherListItem> = {}): TeacherListItem => ({
  id,
  display_name_ar: 'أ. فاطمة الزهراء',
  phone_e164: '+966552147730',
  status: 'active',
  tz: 'Asia/Riyadh',
  active_count: 0,
  trial_count: 0,
  ...over,
});
const page = (items: TeacherListItem[], total = items.length) => ({ items, total, page: 1, pageSize: 25 });
// The rows are on page 1; the list asks for page 2 at its end (a total over 25), which is empty.
const byPage = (first: ReturnType<typeof page>) => async (path: string) =>
  path.includes('page=1&') ? first : { ...first, items: [], page: 2 };

beforeEach(() => jest.clearAllMocks());

test('rows with name + status chip, the API total as the count; tap opens the teacher', async () => {
  mockApiFetch.mockImplementation(
    byPage(page([teacher('t1'), teacher('t2', { display_name_ar: 'أ. محمود', status: 'inactive' })], 31)),
  );
  await renderWithQuery(<TeachersScreen />);
  expect(await screen.findByText('أ. فاطمة الزهراء')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/teachers?page=1&pageSize=25');
  expect(screen.getByText(t.teachers.count.replace('{n}', '31'))).toBeTruthy();
  expect(screen.getByText(t.enums.teacherStatus.active)).toBeTruthy();
  expect(screen.getByText(t.enums.teacherStatus.inactive)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: /^أ\. محمود/ }));
  expect(router.push).toHaveBeenCalledWith('/more/teachers/t2');
});

test('no teachers: the honest empty state', async () => {
  mockApiFetch.mockResolvedValue(page([]));
  await renderWithQuery(<TeachersScreen />);
  expect(await screen.findByRole('header', { name: t.teachers.empty })).toBeTruthy();
});

test('failed with nothing cached: error + retry', async () => {
  mockApiFetch.mockRejectedValueOnce(new ApiError(500)).mockResolvedValue(page([teacher('t1')]));
  await renderWithQuery(<TeachersScreen />);
  expect(await screen.findByRole('alert')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  expect(await screen.findByText('أ. فاطمة الزهراء')).toBeTruthy();
});

test('each row shows «مشترك n · تجريبي n»; a count opens the teacher on that list', async () => {
  mockApiFetch.mockResolvedValue(page([teacher('t1', { active_count: 7, trial_count: 2 })]));
  await renderWithQuery(<TeachersScreen />);
  expect(await screen.findByText(`${t.studentLists.active} 7`)).toBeTruthy();
  expect(screen.getByText(`${t.studentLists.trial} 2`)).toBeTruthy();
  const label = (text: string, n: number) => text.replace('{name}', 'أ. فاطمة الزهراء').replace('{n}', String(n));
  await fireEvent.press(screen.getByRole('button', { name: label(t.studentLists.activeLink, 7) }));
  expect(router.push).toHaveBeenLastCalledWith('/more/teachers/t1?status=active');
  await fireEvent.press(screen.getByRole('button', { name: label(t.studentLists.trialLink, 2) }));
  expect(router.push).toHaveBeenLastCalledWith('/more/teachers/t1?status=trial');
  await fireEvent.press(screen.getByRole('button', { name: /^أ\. فاطمة الزهراء/ }));
  expect(router.push).toHaveBeenLastCalledWith('/more/teachers/t1');
});
