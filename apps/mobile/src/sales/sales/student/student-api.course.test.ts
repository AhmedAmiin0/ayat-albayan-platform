import { bookedCourse, courseView } from '@/sales-course/testing/fixtures';
import { courseState } from './student-api';

test('a paid package with no course: book its days, nothing to change', () => {
  expect(courseState(courseView(), false)).toEqual({ book: true, moves: false, movesOf: null });
});

test('a course exists: change THAT course (its own package), no booking', () => {
  const current = bookedCourse({ subscriptionId: 'running' });
  const view = courseView({ blocked: 'course_exists', current });
  expect(courseState(view, false)).toEqual({ book: false, moves: true, movesOf: 'running' });
});

test('a renewal paid while the course runs: book it, and the moves still change the running one', () => {
  const view = courseView({ current: bookedCourse({ subscriptionId: 'running' }) });
  expect(courseState(view, false)).toEqual({ book: true, moves: true, movesOf: 'running' });
});

test('an imported course (no `current`, course_exists): the moves stay, on the package', () => {
  const view = courseView({ blocked: 'course_exists' });
  expect(courseState(view, false)).toEqual({ book: false, moves: true, movesOf: null });
});

test('no package: neither', () => {
  const view = courseView({ blocked: 'subscription_required', subscription: null });
  expect(courseState(view, false)).toEqual({ book: false, moves: false, movesOf: null });
});

test('loading hides both; a failed read keeps the moves as before', () => {
  expect(courseState(undefined, false)).toEqual({ book: false, moves: false, movesOf: null });
  expect(courseState(undefined, true)).toEqual({ book: false, moves: true, movesOf: null });
});
