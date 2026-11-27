import { screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { lesson } from '@/portal/portal.fixtures';
import { CardTop } from './CardTop';

const now = new Date('2026-11-16T10:00:00.000Z');
const clock = { tz: 'Asia/Riyadh', cycle: '12', locale: 'ar' } as const;
const L = t.portal.app.lesson;
const open = { state: 'open' as const, opens_at: now.toISOString(), closes_at: now.toISOString() };
const show = (l: ReturnType<typeof lesson>, full: boolean, own = false) =>
  renderWithQuery(
    <CardTop lesson={l} clock={clock} now={now} full={full} own={own} />,
    freshQueryClient(),
  );

test('the full card with the window open: «الدخول متاح الآن» instead of the status chip', async () => {
  await show(lesson(now, 5, { window: open }), true);
  expect(screen.getByText(L.openNow)).toBeTruthy();
  expect(screen.queryByText(t.enums.lessonStatus.confirmed)).toBeNull();
});

test('the short card with the window open keeps the status chip', async () => {
  await show(lesson(now, 5, { window: open }), false);
  expect(screen.queryByText(L.openNow)).toBeNull();
  expect(screen.getByText(t.enums.lessonStatus.confirmed)).toBeTruthy();
});

test('before the window: the status chip, titled for the family or for the student', async () => {
  await show(lesson(now, 120), true);
  expect(screen.getByText(new RegExp(`^${t.portal.nextLesson} · `))).toBeTruthy();
  await show(lesson(now, 120), true, true);
  expect(screen.getByText(new RegExp(`^${L.nextLessonSelf} · `))).toBeTruthy();
});
