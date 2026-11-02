import { routeIn, teacherRouteFor } from './notification-route';
import { salesRouteFor } from './notification-route.roles';

// A schedule change (owner 2026-10-30): the teacher opens her schedule, an admin the student.
const KINDS = ['lesson_rescheduled', 'lesson_cancelled', 'course_paused', 'course_resumed'];

test.each(KINDS)('%s: the teacher’s schedule, the admin’s student, the sales students', (kind) => {
  const data = { kind, lessonId: 'l1', studentId: 's-1' };
  expect(teacherRouteFor(data)).toBe('/teacher/schedule');
  expect(routeIn('admin', data)).toBe('/students/s-1');
  expect(salesRouteFor(data)).toBe('/sales/students');
});
