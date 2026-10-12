import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Linking } from 'react-native';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { ltr } from '@/ui/Ltr';
import { TeacherDetailScreen } from './TeacherDetailScreen';
import type { AvailabilityRow, Teacher, TimeOff } from './types';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
let mockParams: Record<string, string> = { id: 't1' };
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

const DAY = 86_400_000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString();
const TEACHER: Teacher = {
  id: 't1',
  display_name_ar: 'أ. فاطمة الزهراء',
  phone_e164: '+966552147730',
  status: 'active',
  tz: 'Asia/Riyadh',
};
/** `range` is «HH:MM-HH:MM». */
const slot = (id: string, weekday: number, range: string): AvailabilityRow => {
  const [start_time = '', end_time = ''] = range.split('-');
  return { id, weekday, start_time, end_time, tz: 'Africa/Cairo' };
};
const GRID = [slot('a', 1, '16:00-18:00'), slot('b', 1, '09:00-11:00'), slot('c', 4, '20:00-22:00')];
const TIME_OFF: TimeOff[] = [
  { id: 'next', starts_at: iso(3), ends_at: iso(5), reason: 'سفر' },
  { id: 'old', starts_at: iso(-20), ends_at: iso(-18), reason: 'عيد' },
];

function serve(routes: Record<string, unknown>) {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path in routes) return routes[path];
    throw new ApiError(404);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: 't1' };
});

test('name, status, LTR phone, weekly grid by day with its zone, and only upcoming time-off', async () => {
  serve({ '/teachers/t1': TEACHER, '/teachers/t1/availability': GRID, '/teachers/t1/time-off': TIME_OFF });
  await renderWithQuery(<TeacherDetailScreen />);
  expect(await screen.findByRole('header', { name: TEACHER.display_name_ar })).toBeTruthy();
  expect(screen.getByText(t.enums.teacherStatus.active)).toBeTruthy();
  expect(screen.getByText(ltr('+966 55 214 7730'))).toBeTruthy();

  expect(await screen.findByText(t.availability.tzHint.replace('{tz}', t.runningHead.cairo))).toBeTruthy();
  expect(screen.getByText(t.enums.weekday['1'])).toBeTruthy();
  expect(screen.getByText(t.enums.weekday['4'])).toBeTruthy();
  expect(screen.queryByText(t.enums.weekday['0'])).toBeNull();
  expect(screen.getByText(ltr('09:00 – 11:00'))).toBeTruthy();
  expect(screen.getByText(ltr('16:00 – 18:00'))).toBeTruthy();

  expect(await screen.findByText(`${t.availability.reason}: سفر`)).toBeTruthy();
  expect(screen.queryByText(`${t.availability.reason}: عيد`)).toBeNull();
  expect(screen.getByText(t.availability.timeOffTzHint)).toBeTruthy();
});

test('«جدول المعلم/ة» opens the teacher’s week', async () => {
  serve({ '/teachers/t1': TEACHER, '/teachers/t1/availability': [], '/teachers/t1/time-off': [] });
  await renderWithQuery(<TeacherDetailScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: t.calendar.teacherCalendar }));
  expect(router.push).toHaveBeenCalledWith('/more/teachers/calendar/t1');
});

test('«مستحقات» opens the teacher’s earnings (pay per session)', async () => {
  serve({ '/teachers/t1': TEACHER, '/teachers/t1/availability': [], '/teachers/t1/time-off': [] });
  await renderWithQuery(<TeacherDetailScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: t.earnings.open }));
  expect(router.push).toHaveBeenCalledWith('/more/teachers/earnings/t1');
});

test('WhatsApp opens the wa.me chat for the teacher’s number', async () => {
  serve({ '/teachers/t1': TEACHER, '/teachers/t1/availability': [], '/teachers/t1/time-off': [] });
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await renderWithQuery(<TeacherDetailScreen />);
  const name = t.students.whatsappTo.replace('{name}', TEACHER.display_name_ar);
  await fireEvent.press(await screen.findByRole('button', { name }));
  expect(open).toHaveBeenCalledWith('https://wa.me/966552147730');
  expect(await screen.findByText(t.availability.empty)).toBeTruthy();
  expect(screen.getByText(t.availability.timeOffEmpty)).toBeTruthy();
  // No grid saved yet: the hint names the teacher's own zone.
  expect(screen.getByText(t.availability.tzHint.replace('{tz}', t.runningHead.riyadh))).toBeTruthy();
});

test('no phone on file: no phone, no WhatsApp button', async () => {
  serve({
    '/teachers/t1': { ...TEACHER, phone_e164: null },
    '/teachers/t1/availability': [],
    '/teachers/t1/time-off': [],
  });
  await renderWithQuery(<TeacherDetailScreen />);
  expect(await screen.findByRole('header', { name: TEACHER.display_name_ar })).toBeTruthy();
  expect(screen.queryByText(t.teachers.phone)).toBeNull();
  expect(screen.getAllByRole('button').map((b) => b.props.accessibilityLabel ?? '')).not.toContain(
    t.students.whatsappTo.replace('{name}', TEACHER.display_name_ar),
  );
});

test('a teacher that does not exist: «لم نجد ما تبحث عنه»', async () => {
  serve({});
  await renderWithQuery(<TeacherDetailScreen />);
  expect(await screen.findByText(t.common.notFound)).toBeTruthy();
});

test('«طلاب المعلم/ة» opens on the list the `status` param names (a tapped count)', async () => {
  mockParams = { id: 't1', status: 'trial' };
  serve({ '/teachers/t1': TEACHER, '/teachers/t1/availability': [], '/teachers/t1/time-off': [] });
  await renderWithQuery(<TeacherDetailScreen />);
  expect(await screen.findByRole('header', { name: t.studentLists.section })).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/students?teacher=t1&status=trial&page=1&pageSize=50');
});
