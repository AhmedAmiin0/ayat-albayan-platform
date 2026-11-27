import { t } from '@ab/mobile-kit';
import { prepareView, titleOf } from '@/lessons/PrepareCard/prepare-card.helpers';

const lessons = (homework: string | null, next_plan: string | null, at: string | null = 'x') => ({
  lessons: [],
  prepare: { homework, next_plan, report_id: 'rep-1', lesson_starts_at: at },
});

test('the home card is titled for the card; the full one for the child or the student', () => {
  expect(titleOf(false, true)).toBe(t.portal.prepareTitle);
  expect(titleOf(true, false)).toBe(t.portal.app.lesson.prepare);
  expect(titleOf(true, true)).toBe(t.portal.app.lesson.prepareSelf);
});

test('nothing to prepare: no view', () => {
  expect(prepareView(lessons(null, null), true)).toBeNull();
  expect(prepareView({ lessons: [] }, true)).toBeNull();
});

test('the home view keeps the first part and no lesson time', () => {
  const view = prepareView(lessons('a', 'b'), false);
  expect(view?.shown.map((p) => p.key)).toEqual(['homework']);
  expect(view?.from).toBeNull();
});

test('the full view keeps both parts, the report and the lesson time', () => {
  const view = prepareView(lessons('a', 'b', '2026-11-14T15:00:00.000Z'), true);
  expect(view?.shown.map((p) => p.key)).toEqual(['homework', 'next']);
  expect(view?.reportId).toBe('rep-1');
  expect(view?.from).toBe('2026-11-14T15:00:00.000Z');
});
