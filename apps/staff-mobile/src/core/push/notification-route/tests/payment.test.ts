import { routeIn, teacherRouteFor } from '@/core/push/notification-route/notification-route';
import { salesRouteFor } from '@/core/push/notification-route.roles';

// The admin opens the student, the assistant her students list.
const DATA = { kind: 'payment_received', studentId: '5a000000-0000-4000-8000-000000000001' };

test('payment_received: the admin’s student (the balance card), the sales students', () => {
  expect(routeIn('admin', DATA)).toBe('/students/5a000000-0000-4000-8000-000000000001');
  expect(routeIn('admin', { kind: 'payment_received' })).toBe('/students');
  expect(salesRouteFor(DATA)).toBe('/sales/students');
  expect(salesRouteFor(DATA, () => false)).toBe('/sales/more');
});

test('payment_received never sends a teacher anywhere but Today', () => {
  expect(teacherRouteFor(DATA)).toBe('/teacher/today');
});
