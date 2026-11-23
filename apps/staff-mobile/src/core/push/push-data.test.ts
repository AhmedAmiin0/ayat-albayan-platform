import { routeFor, teacherRouteFor } from './notification-route';
import { salesRouteFor } from './notification-route.roles';
import { pushStudentId } from './push-data';

// Review finding 8: a push's studentId is untrusted JSON that ends up in a route path, checked by
// one zod schema ({ studentId: z.uuid() }) in every route that opens a student.

const ID = '5a000000-0000-4000-8000-000000000001';

test('a uuid studentId is read', () => {
  expect(pushStudentId({ kind: 'channel_message', studentId: ID })).toBe(ID);
});

test.each([
  ['a path', { studentId: '../more' }],
  ['a query', { studentId: `${ID}?open=x` }],
  ['not a uuid', { studentId: 's-1' }],
  ['empty', { studentId: '' }],
  ['a number', { studentId: 12 }],
  ['missing', { kind: 'payment_due' }],
  ['no object', 'studentId'],
  ['null', null],
])('%s → null', (_name, data) => {
  expect(pushStudentId(data)).toBeNull();
});

test('a studentId that is not a uuid opens the list in every route that opens a student', () => {
  const bad = { studentId: 's-1' };
  expect(salesRouteFor({ kind: 'channel_message', ...bad })).toBe('/sales/students');
  expect(salesRouteFor({ kind: 'payment_due', open: 'course', ...bad })).toBe('/sales/students');
  expect(routeFor({ kind: 'report_submitted', ...bad })).toBe('/students');
  expect(teacherRouteFor({ kind: 'channel_message', ...bad })).toBe('/teacher/more/messages');
});
