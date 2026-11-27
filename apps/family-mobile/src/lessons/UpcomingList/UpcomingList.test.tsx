import { screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { lesson, student } from '@/portal/portal.fixtures';
import { UpcomingList } from './UpcomingList';

const now = new Date('2026-11-16T10:00:00.000Z');
const L = t.portal.app.lesson;
const ahead = (inMin: number, id: string, name: string) =>
  lesson(now, inMin, { id, teacher: { display_name_ar: name, display_name_en: null } });
const show = (lessons: ReturnType<typeof lesson>[], own = false) =>
  renderWithQuery(
    <UpcomingList lessons={lessons} student={student()} now={now} own={own} />,
    freshQueryClient(),
  );

test('only the next lesson ahead: nothing to list', async () => {
  await show([ahead(60, 'a', 'فاطمة')]);
  expect(screen.queryByText(L.upcoming)).toBeNull();
});

test('the lessons after the next one, each with its teacher', async () => {
  await show([ahead(60, 'a', 'فاطمة'), ahead(24 * 60, 'b', 'مريم'), ahead(48 * 60, 'c', 'خديجة')]);
  expect(screen.getByText(L.upcoming)).toBeTruthy();
  expect(screen.queryByText(/فاطمة/)).toBeNull();
  expect(screen.getByText(/مريم/)).toBeTruthy();
  expect(screen.getByText(/خديجة/)).toBeTruthy();
});

test('past lessons are not counted as ahead', async () => {
  await show([ahead(-120, 'p', 'زينب'), ahead(60, 'a', 'فاطمة'), ahead(24 * 60, 'b', 'مريم')]);
  expect(screen.queryByText(/زينب/)).toBeNull();
  expect(screen.queryByText(/فاطمة/)).toBeNull();
  expect(screen.getByText(/مريم/)).toBeTruthy();
});

test('the student’s own app titles the list for them', async () => {
  await show([ahead(60, 'a', 'فاطمة'), ahead(24 * 60, 'b', 'مريم')], true);
  expect(screen.getByText(L.upcomingSelf)).toBeTruthy();
});
