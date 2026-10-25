import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { teacher } from '../testing/fixtures';
import { SalesTeachersScreen } from './SalesTeachersScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const counts = (students: number, today: number) =>
  `${t.sales.teachers.studentsCount.replace('{n}', String(students))} · ${t.sales.teachers.lessonsToday.replace('{n}', String(today))}`;
const kinds = (active: number, trial: number) => t.studentLists.counts.replace('{active}', String(active)).replace('{trial}', String(trial));
const KHALID = { id: 't2', name: 'خالد', name_en: null, gender: 'male' as const, programs: ['quran' as const], lessons_today: 0, students: [] };
const TEACHERS = [teacher({ live_now: true, active_count: 4, trial_count: 2 }), teacher({ ...KHALID, active_count: 0, trial_count: 0 })];

beforeEach(() => mockApiFetch.mockReset());

test('master list: name, gender · programs, counts and «في حلقة الآن»; students are not crammed in the row', async () => {
  mockApiFetch.mockResolvedValue(TEACHERS);
  await renderWithQuery(<SalesTeachersScreen />);
  expect(await screen.findByText('أبرار محمد')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/sales/teachers');
  expect(screen.getByText(counts(2, 3))).toBeTruthy();
  expect(screen.getByText(counts(0, 0))).toBeTruthy();
  expect(screen.getByText(kinds(4, 2))).toBeTruthy();
  expect(screen.getByText(kinds(0, 0))).toBeTruthy();
  expect(screen.getAllByText(t.sales.teachers.liveNow)).toHaveLength(1);
  expect(screen.getByText(`${t.enums.gender.female} · ${t.enums.program.quran}${t.common.listSeparator}${t.enums.program.arabic}`)).toBeTruthy();
  expect(screen.queryByText('جنى علي')).toBeNull();
});

test('a row opens the teacher’s students screen', async () => {
  mockApiFetch.mockResolvedValue(TEACHERS);
  await renderWithQuery(<SalesTeachersScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: /أبرار محمد/ }));
  expect(router.push).toHaveBeenCalledWith('/more/sales/teachers/t1');
});

test('program and gender pills filter the list; nothing left says so', async () => {
  mockApiFetch.mockResolvedValue(TEACHERS);
  await renderWithQuery(<SalesTeachersScreen />);
  await screen.findByText('خالد');
  await fireEvent.press(screen.getByRole('tab', { name: t.enums.program.arabic }));
  expect(screen.queryByText('خالد')).toBeNull();
  await fireEvent.press(screen.getByRole('tab', { name: t.teachers.genderLabel.male }));
  expect(screen.getByText(t.sales.teachers.noMatch)).toBeTruthy();
});

test('no teachers shows the empty state; a failed read shows the error', async () => {
  mockApiFetch.mockResolvedValue([]);
  const first = await renderWithQuery(<SalesTeachersScreen />);
  expect(await screen.findByText(t.sales.teachers.empty)).toBeTruthy();
  await first.unmount();
  mockApiFetch.mockRejectedValue(new Error('offline'));
  await renderWithQuery(<SalesTeachersScreen />);
  expect(await screen.findByRole('alert')).toBeTruthy();
});
