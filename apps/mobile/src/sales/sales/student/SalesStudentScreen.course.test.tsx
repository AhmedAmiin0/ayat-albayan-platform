import type { SalesCourseView } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { bookedCourse, courseView } from '@/sales-course/testing/fixtures';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { details } from './fixtures';
import { SalesStudentScreen } from './SalesStudentScreen';

// «تغيير المعلم» / «تغيير موعد الحلقات» on sales' «تفاصيل الطالب» (owner 2026-11-02): her student
// (`mine`, the ownership rule) or ANY with sales.renew_any, once a course exists; before it
// «أيام الحلقات» (owner 2026-11-06); «إلغاء الاشتراك» whatever `mine` says.
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ id: 'st1' }),
}));

const KEYS = ['self.sales', 'self.sales_academy', 'students.change_teacher', 'courses.reschedule'];
const c = t.courseActions;
const RUNNING = courseView({ blocked: 'course_exists', current: bookedCourse() });

interface Show { mine: boolean; extra?: string[]; course?: SalesCourseView }

async function show({ mine, extra = [], course = RUNNING }: Show) {
  mockApiFetch.mockImplementation(async (path: string) =>
    path.startsWith('/sales/booking/course') ? course : details({ mine }),
  );
  const client = createTestQueryClient({ meFromApi: true });
  client.setQueryDefaults(pathKey('/auth/me'), { staleTime: Infinity });
  client.setQueryData(pathKey('/auth/me'), {
    role: 'sales',
    permissions: [...KEYS, 'subscriptions.stop', ...extra],
  });
  const view = await renderWithQuery(<SalesStudentScreen />, client);
  await screen.findByText(t.sales.student.subscription);
  return view;
}

const calls = () => mockApiFetch.mock.calls.map((call: unknown[]) => String(call[0]));

beforeEach(() => mockApiFetch.mockReset());

test('her student: the teacher and the times change from here', async () => {
  await show({ mine: true });
  expect(await screen.findByRole('button', { name: c.teacher.action })).toBeTruthy();
  expect(screen.getByRole('button', { name: c.times.action })).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.booking.courseDays })).toBeNull();
});

test('a paid package with no course: «أيام الحلقات» opens the wizard, nothing to change', async () => {
  await show({ mine: true, course: courseView() });
  await fireEvent.press(await screen.findByRole('button', { name: t.booking.courseDays }));
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/inbox/sales-course',
    params: { studentId: 'st1' },
  });
  expect(await screen.findByRole('button', { name: c.stop.action })).toBeTruthy();
  expect(screen.queryByRole('button', { name: c.teacher.action })).toBeNull();
  expect(screen.queryByRole('button', { name: c.times.action })).toBeNull();
});

test('not hers while the rule holds: no move (the API would refuse), the stop stays', async () => {
  await show({ mine: false });
  expect(await screen.findByRole('button', { name: c.stop.action })).toBeTruthy();
  expect(screen.queryByRole('button', { name: c.teacher.action })).toBeNull();
  expect(screen.queryByRole('button', { name: c.times.action })).toBeNull();
  expect(screen.queryByRole('button', { name: t.booking.courseDays })).toBeNull();
  const reads = calls();
  expect(reads.some((p) => p.includes('/course-times') || p.includes('/course-teacher'))).toBe(false);
  expect(reads.some((p) => p.startsWith('/sales/booking/course'))).toBe(false);
});

test('not hers, with sales.renew_any: the moves show', async () => {
  await show({ mine: false, extra: ['sales.renew_any'] });
  expect(await screen.findByRole('button', { name: c.teacher.action })).toBeTruthy();
});
