import { bookedCourse, courseView } from '@/sales-course/testing/fixtures';
import { courseState } from './student-api';

test('a paid package with no course: book its days, nothing to change', () => {
  expect(courseState(courseView(), false)).toEqual({ book: true, moves: false });
});

test('a course exists: change it, no booking', () => {
  const view = courseView({ blocked: 'course_exists', current: bookedCourse() });
  expect(courseState(view, false)).toEqual({ book: false, moves: true });
});

test('no package: neither', () => {
  const view = courseView({ blocked: 'subscription_required', subscription: null });
  expect(courseState(view, false)).toEqual({ book: false, moves: false });
});

test('loading hides both; a failed read keeps the moves as before', () => {
  expect(courseState(undefined, false)).toEqual({ book: false, moves: false });
  expect(courseState(undefined, true)).toEqual({ book: false, moves: true });
});
