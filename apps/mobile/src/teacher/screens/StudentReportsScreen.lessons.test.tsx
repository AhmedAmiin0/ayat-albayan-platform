import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { lesson, yusuf } from '@/today/testing/fixtures';
import { StudentReportsScreen } from './StudentReportsScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: (h: string) => mockPush(h),
    back: jest.fn(),
    canGoBack: () => true,
    replace: jest.fn(),
  },
  useLocalSearchParams: () => ({ id: 's1' }),
}));
jest.mock('@/core/lib/time/use-now', () => ({ useNow: () => new Date('2026-11-11T12:00:00Z') }));

const w = t.teacherBoard;
const me = {
  id: 't-abrar',
  display_name_ar: 'أبرار',
  tz: 'Africa/Cairo',
  students: [{ id: 's1', code: 'AB-0182', name: 'يوسف أحمد', tz: 'Asia/Riyadh', status: 'active' }],
};
const at = (day: string) => ({
  starts_at: `2026-11-${day}T13:00:00.000Z`,
  ends_at: `2026-11-${day}T13:45:00.000Z`,
});
const lessons = [
  lesson({
    id: 'l-held',
    status: 'completed',
    ...at('09'),
    students: [{ ...yusuf, attendance: 'on_time', report: { id: 'r1', status: 'submitted' } }],
  }),
  lesson({ id: 'l-absent', status: 'no_show', ...at('10') }),
  lesson({ id: 'l-next', ...at('13') }),
  lesson({ id: 'l-other', ...at('12'), students: [{ ...yusuf, id: 's9', name: 'سلمى' }] }),
];

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(async (p: string) => {
    if (p === '/teachers/me') return me;
    if (p.startsWith('/teachers/me/lessons')) return lessons;
    return { items: [], total: 0, page: 1, pageSize: 10, series: [] };
  });
});

async function openLessons() {
  await renderWithQuery(<StudentReportsScreen />);
  await fireEvent.press(await screen.findByRole('tab', { name: w.lessonsTab }));
}

test('opens on «التقارير»; the lessons are read only once «الحلقات» is chosen', async () => {
  await renderWithQuery(<StudentReportsScreen />);
  expect(await screen.findByText(t.reports.noReports)).toBeTruthy();
  expect(mockApiFetch.mock.calls.some(([p]) => String(p).startsWith('/teachers/me/lessons'))).toBe(
    false,
  );
});

test('«الحلقات»: the window (one call), the counts and rate of the started lessons, this student only', async () => {
  await openLessons();
  expect(
    await screen.findByText(
      `${w.counts.replace('{present}', '1').replace('{absent}', '1')} · ${w.rate.replace('{rate}', '50')}`,
    ),
  ).toBeTruthy();
  const calls = mockApiFetch.mock.calls.filter(([p]) =>
    String(p).startsWith('/teachers/me/lessons'),
  );
  expect(calls).toHaveLength(1);
  expect(screen.getByText(w.window)).toBeTruthy();
  expect(screen.getByText(t.sales.student.kind.present)).toBeTruthy();
  expect(screen.getByText(t.sales.student.kind.absent)).toBeTruthy();
  expect(screen.getByText(t.enums.reportStatus.submitted)).toBeTruthy();
  expect(screen.queryByText(t.reports.noReports)).toBeNull();
});

test('a started lesson opens its report form; «سجل الحضور» opens the teacher log', async () => {
  await openLessons();
  await fireEvent.press(await screen.findByText(t.enums.reportStatus.submitted));
  expect(mockPush).toHaveBeenCalledWith('/teacher/reports/l-held');
  await fireEvent.press(screen.getByRole('button', { name: w.attendanceLog }));
  expect(mockPush).toHaveBeenCalledWith('/teacher/reports/student/attendance/s1');
});

test('no lessons in the window: the empty line', async () => {
  const empty = { items: [], total: 0, page: 1, pageSize: 10, series: [] };
  const answers: [string, unknown][] = [
    ['/teachers/me/lessons', []],
    ['/students/', empty],
  ];
  mockApiFetch.mockImplementation(async (p: string) =>
    p === '/teachers/me' ? me : answers.find(([prefix]) => p.startsWith(prefix))?.[1],
  );
  await openLessons();
  expect(await screen.findByText(w.noLessons)).toBeTruthy();
  expect(
    screen.getByText(w.counts.replace('{present}', '0').replace('{absent}', '0')),
  ).toBeTruthy();
});
