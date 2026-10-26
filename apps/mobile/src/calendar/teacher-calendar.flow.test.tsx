import { renderApp, resetApp } from '@/test/app-router'; // first: its jest.mock calls must precede the app
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { SAT_18, SUN_17 } from '@/teaching/reschedule/fixtures';
import { calendarBackend, NOW } from './testing/flow-backend';

const THIS_WEEK = { from: '2026-09-25T21:00:00.000Z', to: '2026-10-02T21:00:00.000Z' };
const NEXT_WEEK = { from: '2026-10-02T21:00:00.000Z', to: '2026-10-09T21:00:00.000Z' };
const press = async (name: string | RegExp, role: 'button' | 'radio' = 'button') =>
  fireEvent.press(await screen.findByRole(role, { name }));
const lastWeek = (b: ReturnType<typeof calendarBackend>['backend']) => b.sent('GET /lessons').at(-1)?.query;

beforeEach(async () => {
  await resetApp();
  jest.useFakeTimers({ now: NOW, advanceTimers: true });
});
afterEach(() => jest.useRealTimers());

test('More → teachers → teacher → «جدول المعلم»: this week’s agenda; ‹ › changes from/to; an empty week says so', async () => {
  const { backend } = calendarBackend();
  const app = await renderApp({ url: '/more', backend });
  await press(t.nav.teachers);
  await press(/^أبرار/);
  expect(app.pathname()).toBe('/more/teachers/t1');
  await press(t.calendar.teacherCalendar);
  expect(app.pathname()).toBe('/more/teachers/calendar/t1');

  expect(await screen.findByText('16:00')).toBeTruthy();
  expect(screen.getByText('17:00')).toBeTruthy();
  expect(lastWeek(backend)).toMatchObject({ teacherId: 't1', ...THIS_WEEK });
  expect(backend.sent('GET /teachers/:id/availability')).not.toHaveLength(0);

  await press(t.schedule.nextWeek);
  await waitFor(() => expect(lastWeek(backend)).toMatchObject({ teacherId: 't1', ...NEXT_WEEK }));
  expect(await screen.findByText(t.schedule.emptyTeacher)).toBeTruthy();
  expect(screen.queryByText('16:00')).toBeNull();

  await press(t.schedule.prevWeek);
  expect(await screen.findByText('16:00')).toBeTruthy();
  expect(lastWeek(backend)).toMatchObject(THIS_WEEK);
});

test('«الجدول»: every teacher on the day with Riyadh time and the Cairo teacher’s clock; a clash, then another slot moves it', async () => {
  const { backend, state } = calendarBackend();
  backend.failOnce(
    'POST /lessons/:id/reschedule',
    new ApiError(409, { code: 'conflict', conflicts: [{ kind: 'teacher_busy', startsAt: SUN_17, endsAt: '2026-10-04T14:45:00.000Z' }] }),
  );
  const app = await renderApp({ url: '/', backend });
  await press(t.schedule.nav);
  expect(app.pathname()).toBe('/schedule');
  expect(await screen.findByText('أبرار')).toBeTruthy();
  expect(screen.getByText('عمر')).toBeTruthy(); // a teacher with nothing booked is listed too
  expect(backend.sent('GET /lessons/overview')[0]?.query).toMatchObject(THIS_WEEK);
  expect(screen.getByText('16:00')).toBeTruthy();
  expect(screen.getAllByText(/القاهرة/).length).toBeGreaterThan(0);

  await press(/^غيّر الموعد — يوسف أحمد/);
  await press('الأحد 4 أكتوبر', 'radio');
  await press('17:00', 'radio');
  const submit = screen.getAllByRole('button', { name: t.lessons.rescheduleSubmit }).at(-1);
  if (!submit) throw new Error('no submit in the sheet');
  await fireEvent.press(submit);
  expect(await screen.findByText(t.booking.conflictTitle)).toBeTruthy();
  expect(screen.getByText(t.booking.conflict.teacher_busy.replace('{when}', 'الأحد 4 أكتوبر 17:00'))).toBeTruthy();

  await press(t.booking.changeSlot);
  await press('السبت 3 أكتوبر', 'radio');
  await press('18:00', 'radio');
  const again = screen.getAllByRole('button', { name: t.lessons.rescheduleSubmit }).at(-1);
  if (!again) throw new Error('no submit in the sheet');
  await fireEvent.press(again);
  expect(await screen.findByText(t.lessons.rescheduled)).toBeTruthy();
  const posts = backend.sent('POST /lessons/:id/reschedule');
  expect(posts).toHaveLength(2);
  expect(posts[0]?.path).toBe('/lessons/l-pending/reschedule');
  expect(posts[1]?.body).toEqual({ scope: 'one', startsAt: SAT_18 });
  expect(state.lessons.find((l) => l.id === 'l-pending')?.starts_at).toBe(SAT_18);

  await press(t.reschedule.done);
  await waitFor(() => expect(screen.queryByText('16:00')).toBeNull());
  expect(screen.getByText('17:00')).toBeTruthy();
});
