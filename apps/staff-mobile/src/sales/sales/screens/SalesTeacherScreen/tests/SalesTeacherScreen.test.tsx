import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t, ltr } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { teacher } from '@/sales/sales/testing/fixtures';
import { SalesTeacherScreen } from '@/sales/sales/screens/SalesTeacherScreen';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
let mockId = 't1';
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ id: mockId }),
}));

beforeEach(() => {
  mockApi.reset('read');
  mockId = 't1';
});

test('the teacher’s students: name, code, program, status, next lesson in Riyadh time', async () => {
  mockApi.onRead(() => [teacher({ live_now: true })]);
  await renderWithQuery(<SalesTeacherScreen />);
  expect(
    await screen.findByRole('header', {
      name: t.sales.teachers.detailTitle.replace('{name}', 'أبرار محمد'),
    }),
  ).toBeTruthy();
  expect(screen.getByText(ltr('AB-0183'))).toBeTruthy();
  expect(screen.getByText(`${t.sales.teachers.nextLesson}: الاثنين 12 أكتوبر 18:00`)).toBeTruthy();
  await fireEvent.press(screen.getByRole('tab', { name: `${t.studentLists.trial} 1` }));
  expect(screen.getByText(t.enums.studentStatus.trial)).toBeTruthy();
  expect(screen.getByText(t.sales.teachers.noNextLesson)).toBeTruthy();
  expect(screen.getByText(t.sales.teachers.liveNow)).toBeTruthy();
  expect(screen.queryByText(/\+966|http/)).toBeNull();
});

test('«اعرض جدول المعلم/ة اليوم» opens the read-only schedule on that teacher', async () => {
  mockApi.onRead(() => [teacher()]);
  await renderWithQuery(<SalesTeacherScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: t.sales.teachers.openSchedule }));
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/more/sales/schedule',
    params: { teacherId: 't1' },
  });
});

test('an unknown teacher says not found; no students says so', async () => {
  mockId = 'nope';
  mockApi.onRead(() => [teacher()]);
  const first = await renderWithQuery(<SalesTeacherScreen />);
  expect(await screen.findByText(t.common.notFound)).toBeTruthy();
  await first.unmount();
  mockId = 't1';
  mockApi.onRead(() => [teacher({ students: [] })]);
  await renderWithQuery(<SalesTeacherScreen />);
  expect(await screen.findByText(t.sales.teachers.noStudents)).toBeTruthy();
});

test('«تجريبي» = new, trial and pending_subscription; a package-ended student shows under «الكل» only', async () => {
  const st = (id: string, name: string, status: 'new' | 'pending_subscription' | 'expired') => ({
    id,
    code: `AB-0${id}`,
    name,
    program: 'quran' as const,
    status,
    next_lesson_at: null,
  });
  const extra = [
    st('301', 'سارة', 'new'),
    st('302', 'ليلى', 'pending_subscription'),
    st('303', 'عمر', 'expired'),
  ];
  mockApi.onRead(() => [teacher({ trial_count: 3, students: [...teacher().students, ...extra] })]);
  await renderWithQuery(<SalesTeacherScreen />);
  expect(await screen.findByText('يوسف أحمد')).toBeTruthy();
  expect(screen.queryByText('عمر')).toBeNull();
  await fireEvent.press(screen.getByRole('tab', { name: `${t.studentLists.trial} 3` }));
  for (const name of ['جنى علي', 'سارة', 'ليلى']) expect(screen.getByText(name)).toBeTruthy();
  expect(screen.getByText(t.enums.studentStatus.pending_subscription)).toBeTruthy();
  expect(screen.queryByText('عمر')).toBeNull();
  await fireEvent.press(screen.getByRole('tab', { name: `${t.studentLists.all} 5` }));
  expect(screen.getByText(t.enums.studentStatus.expired)).toBeTruthy();
});
