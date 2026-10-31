import { formatPhone, RIYADH_TZ } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { whenIn } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { ltr } from '@/core/ui/primitives/Ltr';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { details, trialLesson, upcoming } from './fixtures';
import { SalesStudentScreen } from './SalesStudentScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (mockPath: string) => mockApiFetch(mockPath) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useLocalSearchParams: () => ({ id: 'st1' }) }));
jest.mock('@/core/lib/clock/device-clock', () => ({ deviceUses24: () => true }));

const s = t.sales.student;
beforeEach(() => {
  mockApiFetch.mockReset();
  fakeNow(new Date('2026-10-27T10:00:00Z'));
});
afterEach(() => jest.useRealTimers());

/** Another salesperson's student as the API answers it (owner 2026-10-30): all of it, nobody `mine`. */
const notMine = () => {
  const lesson = upcoming('u1', '2026-10-27T10:30:00.000Z');
  return details({
    mine: false,
    schedule: { student_tz: 'Africa/Cairo', weekly: [], upcoming: [{ ...lesson, students: lesson.students.map((st) => ({ id: st.id, code: st.code, name: st.name, tz: st.tz })) }] },
  });
};

test('the trial first: date and time in Riyadh, the teacher, the outcome chip; several dates newest first', async () => {
  const moved = { ...trialLesson, lesson_id: 'tr0', starts_at: '2026-09-20T15:00:00.000Z', status: 'rescheduled' as const, outcome: 'moved' as const, teacher_name: null };
  mockApiFetch.mockResolvedValue(details({ trial: [trialLesson, moved] }));
  await renderWithQuery(<SalesStudentScreen />);
  expect(await screen.findByRole('header', { name: s.trial.title })).toBeTruthy();
  expect(screen.getByText(`${whenIn(new Date(trialLesson.starts_at), RIYADH_TZ, '24')} ${t.schedule.riyadhTime}`)).toBeTruthy();
  expect(screen.getByText(s.trial.teacher.replace('{name}', 'أبرار محمد'))).toBeTruthy();
  expect(screen.getAllByText(t.trialDate.outcome.attended)).toHaveLength(2); // the trial's chip and the attendance list's
  expect(screen.getByText(t.trialDate.outcome.moved)).toBeTruthy();
});

test('no trial: «لا توجد حلقة تجريبية»; an old cache without it shows no trial block', async () => {
  mockApiFetch.mockResolvedValue(details());
  const view = await renderWithQuery(<SalesStudentScreen />);
  expect(await screen.findByText(s.trial.none)).toBeTruthy();
  await view.unmount();
  const old: Record<string, unknown> = { ...details() };
  delete old.trial;
  delete old.mine;
  mockApiFetch.mockResolvedValue(old);
  await renderWithQuery(<SalesStudentScreen />);
  expect(await screen.findByText(s.current)).toBeTruthy();
  expect(screen.queryByRole('header', { name: s.trial.title })).toBeNull();
});

test('not hers: no note; trial, subscription, schedule, attendance and reports as hers; move / cancel stay', async () => {
  mockApiFetch.mockResolvedValue(notMine());
  await renderWithQuery(<SalesStudentScreen />);
  expect(await screen.findByRole('header', { name: s.trial.title })).toBeTruthy();
  expect(screen.queryByText(/ليس من طلابك/)).toBeNull();
  expect(screen.getByRole('header', { name: s.schedule.title })).toBeTruthy();
  expect(screen.getByText(s.attendance)).toBeTruthy();
  expect(screen.getByText(s.subscription)).toBeTruthy();
  expect(screen.getByText(s.current)).toBeTruthy();
  expect(screen.getByText(s.showPast.replace('{n}', '1'))).toBeTruthy();
  expect(screen.queryByText(t.reports.noReports)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${t.lessons.sheet.openRow.replace('{names}', 'يوسف أحمد')}`) }));
  expect(await screen.findByText(t.lessons.details)).toBeTruthy();
  expect(screen.getByRole('button', { name: t.sales.lessonActions.reschedule })).toBeTruthy();
  expect(screen.getByRole('button', { name: t.sales.lessonActions.cancel })).toBeTruthy();
});

test('hers, the same lesson: «تغيير الموعد» and «إلغاء الحلقة» stay', async () => {
  mockApiFetch.mockResolvedValue(details({ schedule: { student_tz: 'Africa/Cairo', weekly: [], upcoming: [upcoming('u1', '2026-10-27T10:30:00.000Z')] } }));
  await renderWithQuery(<SalesStudentScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: new RegExp(`^${t.lessons.sheet.openRow.replace('{names}', 'يوسف أحمد')}`) }));
  expect(await screen.findByRole('button', { name: t.sales.lessonActions.reschedule })).toBeTruthy();
});

test('not hers, with a phone: «فتح المحادثة» opens the family\'s chat in the sales inbox', async () => {
  mockApiFetch.mockResolvedValue(notMine());
  await renderWithQuery(<SalesStudentScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: `${s.chat} ${ltr(formatPhone('+201001112223'))}` }));
  expect(router.push).toHaveBeenCalledWith('/sales/inbox/thread/%2B201001112223');
});
