import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { scheduleLesson } from '../testing/fixtures';
import { SalesTodayScreen } from './SalesTodayScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (mockPath: string) => mockApiFetch(mockPath) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn() }, useLocalSearchParams: () => ({}) }));
jest.mock('@/notifications/BellButton', () => ({ BellButton: () => null }));

// No admin action for sales (docs/16): no تأكيد / إلغاء / «غيّر الميعاد» / «عدّل الوقت» / «حجز تعويضي»
// anywhere, only her own «تغيير الموعد» / «إلغاء الحلقة» in the sheet (any lesson, owner 2026-10-28);
// «ادخل الحلقة» only on a running lesson. 18:10 Riyadh on Monday 12 Oct 2026.
const ADMIN_ACTIONS = [t.today.confirmLesson, t.today.confirm, t.today.cancel, t.lessons.rescheduleSubmit, t.editTime.action, t.booking.makeup.action];
const running = scheduleLesson({ status: 'scheduled' });
const soon = scheduleLesson({ id: 'l2', status: 'scheduled', starts_at: '2026-10-12T15:20:00.000Z', ends_at: '2026-10-12T15:50:00.000Z', students: [{ id: 'st3', code: 'AB-0200', name: 'سلمى' }] });

const day = (...lessons: object[]) => mockApiFetch.mockImplementation(async () => ({ date: '2026-10-12', lessons }));
const noAdminAction = () => {
  for (const label of ADMIN_ACTIONS) expect(screen.queryByRole('button', { name: new RegExp(`^${label}$`) })).toBeNull();
};

beforeEach(() => {
  mockApiFetch.mockReset();
  fakeNow(new Date('2026-10-12T15:10:00.000Z'));
});
afterEach(() => jest.useRealTimers());

test('a running lesson awaiting confirmation: the hero offers «ادخل الحلقة», never «تأكيد الحلقة»', async () => {
  day(running, soon);
  await renderWithQuery(<SalesTodayScreen />);
  expect(await screen.findByText(t.today.running)).toBeTruthy();
  expect(screen.getByRole('button', { name: t.classroom.enter })).toBeTruthy();
  expect(screen.getByRole('button', { name: t.today.details })).toBeTruthy();
  noAdminAction();
});

test('the next lesson, ten minutes away: no «ادخل الحلقة» yet (only once it runs), no confirm', async () => {
  day(soon);
  await renderWithQuery(<SalesTodayScreen />);
  expect(await screen.findByText('الحلقة التالية · بعد 10 دقائق')).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.classroom.enter })).toBeNull();
  noAdminAction();
});

test('the hero opens «تفاصيل الحلقة»: her move / cancel, no «للاطلاع فقط», no admin action, join while it runs', async () => {
  day(running, soon);
  await renderWithQuery(<SalesTodayScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: t.today.details }));
  expect(await screen.findByRole('header', { name: 'يوسف أحمد' })).toBeTruthy();
  expect(screen.queryByText(t.lessons.sheet.readOnly)).toBeNull();
  expect(screen.getByRole('button', { name: t.sales.lessonActions.cancel })).toBeTruthy();
  noAdminAction();
  expect(screen.getAllByRole('button', { name: t.classroom.enter }).length).toBeGreaterThan(0);
});

test('a row opens the same sheet; a lesson not yet running has no «ادخل الحلقة» there', async () => {
  day(running, soon);
  await renderWithQuery(<SalesTodayScreen />);
  await screen.findByText(t.today.running);
  const enterBefore = screen.getAllByRole('button', { name: t.classroom.enter }).length;
  await fireEvent.press(screen.getByRole('button', { name: /سلمى/ }));
  expect(await screen.findByRole('header', { name: 'سلمى' })).toBeTruthy();
  expect(screen.getByRole('button', { name: t.sales.lessonActions.reschedule })).toBeTruthy();
  noAdminAction();
  expect(screen.getAllByRole('button', { name: t.classroom.enter })).toHaveLength(enterBefore);
});
