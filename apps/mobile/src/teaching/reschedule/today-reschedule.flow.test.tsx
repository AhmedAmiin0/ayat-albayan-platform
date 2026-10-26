import { renderApp, resetApp } from '@/test/app-router'; // first: its jest.mock calls must precede the app
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { calendarBackend, NOW } from '@/calendar/testing/flow-backend';
import { t } from '@/core/lib/i18n/i18n';

beforeEach(async () => {
  await resetApp();
  jest.useFakeTimers({ now: NOW, advanceTimers: true });
});
afterEach(() => jest.useRealTimers());

test('Today → «التفاصيل» → «غيّر الموعد» → «هذه الحلقة وكل ما بعدها» → a weekly rule; Today refetches and the lesson leaves', async () => {
  const { backend } = calendarBackend();
  const app = await renderApp({ url: '/', backend });
  expect(await screen.findByText('يوسف أحمد')).toBeTruthy();
  // The 16:00 lesson runs: it is the hero; its actions are in «تفاصيل الحلقة».
  await fireEvent.press(screen.getByRole('button', { name: t.today.details }));
  await fireEvent.press(await screen.findByRole('button', { name: `${t.lessons.rescheduleSubmit} — يوسف أحمد` }));
  expect(await screen.findByRole('header', { name: t.lessons.rescheduleTitle })).toBeTruthy();

  await fireEvent.press(await screen.findByRole('radio', { name: t.lessons.scope.rule }));
  await fireEvent.press(await screen.findByRole('radio', { name: 'الأحد 4 أكتوبر' }));
  await fireEvent.press(screen.getByRole('radio', { name: '17:00' }));
  expect(screen.getByRole('checkbox', { name: t.enums.weekday['0'], checked: true })).toBeTruthy();
  const submit = screen.getAllByRole('button', { name: t.lessons.rescheduleSubmit }).at(-1);
  if (!submit) throw new Error('no submit in the sheet');
  await fireEvent.press(submit);

  expect(await screen.findByText(t.reschedule.seriesMoved)).toBeTruthy();
  const [post] = backend.sent('POST /lessons/:id/reschedule');
  expect(post?.path).toBe('/lessons/l-pending/reschedule');
  expect(post?.body).toEqual({
    scope: 'rule',
    newRule: {
      teacherId: 't1',
      byday: [0],
      startTimeLocal: '17:00',
      tz: 'Asia/Riyadh',
      durationMin: 45,
      startsOn: '2026-10-04',
    },
  });
  expect(backend.sent('GET /booking/slots')[0]?.query).toMatchObject({ teacherId: 't1', durationMin: '45', studentIds: 's1' });

  await fireEvent.press(screen.getByRole('button', { name: t.reschedule.done }));
  await fireEvent.press(screen.getByRole('button', { name: t.common.close }));
  expect(app.pathname()).toBe('/');
  await waitFor(() => expect(screen.queryByText('يوسف أحمد')).toBeNull());
  expect(backend.sent('GET /lessons/day').length).toBeGreaterThan(1);
});
