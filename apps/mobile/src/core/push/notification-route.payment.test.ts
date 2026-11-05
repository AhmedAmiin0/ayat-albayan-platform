import { routeIn, teacherRouteFor } from './notification-route';
import { salesRouteFor } from './notification-route.roles';

// «تم استلام دفعة» (owner 2026-11-05): the admin opens the student, the assistant her students.
const DATA = { kind: 'payment_received', studentId: 's-1' };

test('payment_received: the admin’s student (the balance card), the sales students', () => {
  expect(routeIn('admin', DATA)).toBe('/students/s-1');
  expect(routeIn('admin', { kind: 'payment_received' })).toBe('/students');
  expect(salesRouteFor(DATA)).toBe('/sales/students');
  expect(salesRouteFor(DATA, () => false)).toBe('/sales/more');
});

test('payment_received never sends a teacher anywhere but Today', () => {
  expect(teacherRouteFor(DATA)).toBe('/teacher/today');
});
