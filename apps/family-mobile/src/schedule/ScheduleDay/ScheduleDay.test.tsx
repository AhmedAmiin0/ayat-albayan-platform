import { screen } from '@testing-library/react-native';
import { dateText } from '@ab/time';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { lesson, student } from '@/portal/portal.fixtures';
import { ScheduleDay } from './ScheduleDay';

const now = new Date('2026-11-16T09:00:00.000Z');
const clock = { tz: 'Asia/Riyadh', cycle: '12' as const, locale: 'ar' as const };
const entry = (inMin: number, id: string) => ({
  student: student(),
  lesson: lesson(now, inMin, { id }),
});
const show = (lessons: ReturnType<typeof entry>[]) =>
  renderWithQuery(
    <ScheduleDay day={{ day: 'd', lessons }} clock={clock} now={now} />,
    freshQueryClient(),
  );
const nameOf = (at: Date) => dateText(at, clock, { weekday: 'long', day: 'numeric' });

test("today's lessons: the «today» header and one row per lesson", async () => {
  const first = entry(60, 'a');
  await show([first, entry(120, 'b')]);
  const name = nameOf(new Date(first.lesson.starts_at));
  const header = t.portal.app.schedule.today.replace('{day}', name);
  expect(screen.getByRole('header', { name: header })).toBeTruthy();
});

test('a later day: its plain name as the header', async () => {
  const later = entry(3 * 24 * 60, 'c');
  await show([later]);
  expect(
    screen.getByRole('header', { name: nameOf(new Date(later.lesson.starts_at)) }),
  ).toBeTruthy();
});

test('a day with no lesson is named from now', async () => {
  await show([]);
  const header = t.portal.app.schedule.today.replace('{day}', nameOf(now));
  expect(screen.getByRole('header', { name: header })).toBeTruthy();
});
