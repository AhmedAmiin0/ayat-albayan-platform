import type { TeacherStudentView } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { TeacherStudentsScreen } from './TeacherStudentsScreen';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiFetch: (p: string) => mockApiFetch(p) }));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (h: string) => mockPush(h) } }));

const row = (over: Partial<TeacherStudentView>): TeacherStudentView => ({
  ...{ id: 's1', code: 'AB-0183', name: 'سهيلة', status: 'active', program: 'quran', level: 'جزء عمّ', age: 9 },
  ...{ next_lesson_at: null },
  ...over,
});
const SUBSCRIBED = [row({}), row({ id: 's2', name: 'يوسف', code: 'AB-0190', level: null, age: null })];
const TRIAL = [row({ id: 's3', name: 'بلال', code: 'AB-0201', status: 'trial', next_lesson_at: '2026-10-05T14:00:00.000Z' })];

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(async (p: string) => {
    if (p === '/teachers/me') return { id: 't1', display_name_ar: 'أبرار', tz: 'Africa/Cairo', students: [] };
    return p.endsWith('kind=trial') ? TRIAL : SUBSCRIBED;
  });
});

test('opens on «مشتركون»: only subscribed students; a row opens their report history', async () => {
  await renderWithQuery(<TeacherStudentsScreen />);
  expect(await screen.findByText('سهيلة')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/teachers/me/students?kind=subscribed');
  expect(screen.queryByText('بلال')).toBeNull();
  expect(screen.getByText(/AB-0183/)).toBeTruthy();
  await fireEvent.press(screen.getByText('سهيلة'));
  expect(mockPush).toHaveBeenCalledWith('/teacher/reports/student/s1');
});

test('a package-ended student (pending_renewal, expired) stays in «مشتركون» with its chip; active rows carry none', async () => {
  mockApiFetch.mockImplementation(async (p: string) =>
    p === '/teachers/me' ? { id: 't1', display_name_ar: 'أبرار', tz: 'Africa/Cairo', students: [] } : [row({}), row({ id: 's4', name: 'مريم', status: 'pending_renewal' }), row({ id: 's5', name: 'زيد', status: 'expired' })],
  );
  await renderWithQuery(<TeacherStudentsScreen />);
  expect(await screen.findByText('مريم')).toBeTruthy();
  expect(screen.getAllByText(t.enums.studentStatus.pending_renewal)).toHaveLength(1);
  expect(screen.getAllByText(t.enums.studentStatus.expired)).toHaveLength(1);
  expect(screen.queryByText(t.enums.studentStatus.active)).toBeNull();
});

test('«تجريبي» swaps to the trial list, with the next lesson in her time zone; never mixed', async () => {
  await renderWithQuery(<TeacherStudentsScreen />);
  await screen.findByText('سهيلة');
  const tabs = screen.getAllByRole('tab');
  expect(tabs).toHaveLength(2);
  await fireEvent.press(screen.getByText(t.teacherStudents.trial));
  expect(await screen.findByText('بلال')).toBeTruthy();
  expect(screen.queryByText('سهيلة')).toBeNull();
  expect(screen.getByText(/17:00/)).toBeTruthy();
});

test('empty and failed states', async () => {
  mockApiFetch.mockImplementation(async (p: string) => {
    if (p === '/teachers/me') return { id: 't1', display_name_ar: 'أبرار', tz: 'Africa/Cairo', students: [] };
    if (p.endsWith('kind=trial')) throw new Error('boom');
    return [];
  });
  await renderWithQuery(<TeacherStudentsScreen />);
  expect(await screen.findByText(t.teacherStudents.emptySubscribed)).toBeTruthy();
  await fireEvent.press(screen.getByText(t.teacherStudents.trial));
  expect(await screen.findByText(t.teacherStudents.loadFailed)).toBeTruthy();
});
