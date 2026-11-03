import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { details } from './fixtures';
import { SalesStudentScreen } from './SalesStudentScreen';

// «تغيير المعلم» / «تغيير موعد الحلقات» on sales' «تفاصيل الطالب» (owner 2026-11-02): her student
// (`mine`, the ownership rule) or ANY with sales.renew_any; «إلغاء الاشتراك» whatever `mine` says.
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

async function show(mine: boolean, extra: string[] = []) {
  mockApiFetch.mockResolvedValue(details({ mine }));
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

beforeEach(() => mockApiFetch.mockReset());

test('her student: the teacher and the times change from here', async () => {
  await show(true);
  expect(await screen.findByRole('button', { name: c.teacher.action })).toBeTruthy();
  expect(screen.getByRole('button', { name: c.times.action })).toBeTruthy();
});

test('not hers while the rule holds: no move (the API would refuse), the stop stays', async () => {
  await show(false);
  expect(await screen.findByRole('button', { name: c.stop.action })).toBeTruthy();
  expect(screen.queryByRole('button', { name: c.teacher.action })).toBeNull();
  expect(screen.queryByRole('button', { name: c.times.action })).toBeNull();
  const paths = mockApiFetch.mock.calls.map((call: unknown[]) => String(call[0]));
  expect(paths.some((p) => p.includes('/course-times') || p.includes('/course-teacher'))).toBe(false);
});

test('not hers, with sales.renew_any: the moves show', async () => {
  await show(false, ['sales.renew_any']);
  expect(await screen.findByRole('button', { name: c.teacher.action })).toBeTruthy();
});
