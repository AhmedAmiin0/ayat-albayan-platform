import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { teacher } from '@/sales/sales/testing/fixtures';
import { SalesTeachersScreen } from './SalesTeachersScreen';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const counts = (students: number, today: number) =>
  `${t.sales.teachers.studentsCount.replace('{n}', String(students))} · ${t.sales.teachers.lessonsToday.replace('{n}', String(today))}`;
const kinds = (active: number, trial: number) =>
  t.studentLists.counts.replace('{active}', String(active)).replace('{trial}', String(trial));
const KHALID = {
  id: 't2',
  name: 'خالد',
  name_en: null,
  gender: 'male' as const,
  programs: ['quran' as const],
  lessons_today: 0,
  students: [],
};
const TEACHERS = [
  teacher({ live_now: true, active_count: 4, trial_count: 2 }),
  teacher({ ...KHALID, active_count: 0, trial_count: 0 }),
];

beforeEach(() => mockApi.reset('read'));

test('master list: name, gender · programs, counts and «في حلقة الآن»; students are not crammed in the row', async () => {
  mockApi.onRead(() => TEACHERS);
  await renderWithQuery(<SalesTeachersScreen />);
  expect(await screen.findByText('أبرار محمد')).toBeTruthy();
  expect(mockApi.reads()).toContainEqual({ method: 'GET', path: '/sales/teachers' });
  expect(screen.getByText(counts(2, 3))).toBeTruthy();
  expect(screen.getByText(counts(0, 0))).toBeTruthy();
  expect(screen.getByText(kinds(4, 2))).toBeTruthy();
  expect(screen.getByText(kinds(0, 0))).toBeTruthy();
  expect(screen.getAllByText(t.sales.teachers.liveNow)).toHaveLength(1);
  expect(
    screen.getByText(
      `${t.enums.gender.female} · ${t.enums.program.quran}${t.common.listSeparator}${t.enums.program.arabic}`,
    ),
  ).toBeTruthy();
  expect(screen.queryByText('جنى علي')).toBeNull();
});

test('a row opens the teacher’s students screen', async () => {
  mockApi.onRead(() => TEACHERS);
  await renderWithQuery(<SalesTeachersScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: /أبرار محمد/ }));
  expect(router.push).toHaveBeenCalledWith('/more/sales/teachers/t1');
});

test('program and gender pills filter the list; nothing left says so', async () => {
  mockApi.onRead(() => TEACHERS);
  await renderWithQuery(<SalesTeachersScreen />);
  await screen.findByText('خالد');
  await fireEvent.press(screen.getByRole('tab', { name: t.enums.program.arabic }));
  expect(screen.queryByText('خالد')).toBeNull();
  await fireEvent.press(screen.getByRole('tab', { name: t.teachers.genderLabel.male }));
  expect(screen.getByText(t.sales.teachers.noMatch)).toBeTruthy();
});

test('no teachers shows the empty state; a failed read shows the error', async () => {
  mockApi.onRead(() => []);
  const first = await renderWithQuery(<SalesTeachersScreen />);
  expect(await screen.findByText(t.sales.teachers.empty)).toBeTruthy();
  await first.unmount();
  mockApi.onRead(() => Promise.reject(new Error('offline')));
  await renderWithQuery(<SalesTeachersScreen />);
  expect(await screen.findByRole('alert')).toBeTruthy();
});

test('the compact top: «المعلمون · 2» on the title’s line, the rows in one inset card', async () => {
  mockApi.onRead(() => TEACHERS);
  await renderWithQuery(<SalesTeachersScreen />);
  expect(await screen.findByRole('header', { name: `${t.sales.teachers.title} · 2` })).toBeTruthy();
  expect(screen.getAllByTestId('inset-cell')).toHaveLength(2);
});
