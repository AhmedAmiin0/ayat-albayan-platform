import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { teacher } from './fixtures';
import { SalesTeacherScreen } from './SalesTeacherScreen';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useLocalSearchParams: () => ({ id: 't1' }) }));

const L = t.studentLists;
const PAUSED = { id: 'st3', code: 'AB-0201', name: 'سلمى', program: 'quran' as const, status: 'paused' as const, next_lesson_at: null };
const tab = (label: string, n: number) => screen.getByRole('tab', { name: `${label} ${n}` });

beforeEach(() => mockApiFetch.mockReset());

test('opens on «مشترك»: only the subscribed students; the counts come from the API', async () => {
  const tc = teacher({ active_count: 1, trial_count: 1 });
  mockApiFetch.mockResolvedValue([{ ...tc, students: [...tc.students, PAUSED] }]);
  await renderWithQuery(<SalesTeacherScreen />);
  expect(await screen.findByText('يوسف أحمد')).toBeTruthy();
  expect(tab(L.active, 1).props.accessibilityState).toMatchObject({ selected: true });
  expect(tab(L.trial, 1)).toBeTruthy();
  expect(tab(L.all, 3)).toBeTruthy();
  expect(screen.queryByText('جنى علي')).toBeNull();
  expect(screen.queryByText('سلمى')).toBeNull();
});

test('«تجريبي» shows the trial students, «الكل» everyone (paused included)', async () => {
  const tc = teacher();
  mockApiFetch.mockResolvedValue([{ ...tc, students: [...tc.students, PAUSED] }]);
  await renderWithQuery(<SalesTeacherScreen />);
  await screen.findByText('يوسف أحمد');
  await fireEvent.press(tab(L.trial, 1));
  expect(screen.getByText('جنى علي')).toBeTruthy();
  expect(screen.queryByText('يوسف أحمد')).toBeNull();
  await fireEvent.press(tab(L.all, 3));
  expect(screen.getByText('يوسف أحمد')).toBeTruthy();
  expect(screen.getByText('جنى علي')).toBeTruthy();
  expect(screen.getByText('سلمى')).toBeTruthy();
});

test('a kind with nobody says so in its own words', async () => {
  const tc = teacher({ trial_count: 0 });
  mockApiFetch.mockResolvedValue([{ ...tc, students: tc.students.filter((s) => s.status === 'active') }]);
  await renderWithQuery(<SalesTeacherScreen />);
  await screen.findByText('يوسف أحمد');
  await fireEvent.press(tab(L.trial, 0));
  expect(screen.getByText(L.emptyTrial)).toBeTruthy();
});
