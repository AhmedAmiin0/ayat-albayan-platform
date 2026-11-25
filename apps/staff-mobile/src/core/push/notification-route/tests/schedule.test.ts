import { routeIn, teacherRouteFor } from '@/core/push/notification-route/notification-route';
import { salesRouteFor } from '@/core/push/notification-route.roles';

// A schedule change: the teacher opens her schedule, an admin the student.
const KINDS = ['lesson_rescheduled', 'lesson_cancelled', 'course_paused', 'course_resumed'];

test.each(KINDS)('%s: the teacher’s schedule, the admin’s student, the sales students', (kind) => {
  const data = { kind, lessonId: 'l1', studentId: '5a000000-0000-4000-8000-000000000001' };
  expect(teacherRouteFor(data)).toBe('/teacher/schedule');
  expect(routeIn('admin', data)).toBe('/students/5a000000-0000-4000-8000-000000000001');
  expect(salesRouteFor(data)).toBe('/sales/students');
});
