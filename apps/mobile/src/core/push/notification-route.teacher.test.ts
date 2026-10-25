import { PUSH_KINDS } from '@ab/shared';
import { notificationsHref, routeIn, teacherRouteFor } from './notification-route';

const PHONE = '+966552147730';

test.each([
  [{ kind: 'new_message', phone: PHONE }, '/teacher/chats/%2B966552147730'],
  [{ kind: 'new_lead' }, '/teacher/chats'],
  [{ kind: 'lesson_needs_confirmation', lessonId: 'l1' }, '/teacher/today'],
  [{ kind: 'report_submitted', studentId: 's-1' }, '/teacher/reports'],
  [{ kind: 'payment_due', studentId: 's-1' }, '/teacher/today'],
  [{ kind: 'new_student', lessonId: 'l1', studentId: 's-1' }, '/teacher/schedule'],
  [{ kind: 'meeting_invite', meetingId: 'm1' }, '/teacher/more/meetings'],
  [{ kind: 'google_sync_alert' }, '/teacher/today'],
])('a teacher tapping %j opens %s', (data, href) => {
  expect(teacherRouteFor(data)).toBe(href);
});

test('every kind opens a teacher route, never an admin one', () => {
  for (const kind of PUSH_KINDS) expect(teacherRouteFor({ kind, studentId: 's-1' })).toMatch(/^\/teacher\//);
});

test('a message push without inbox.read opens her Today, not a hidden tab', () => {
  expect(teacherRouteFor({ kind: 'new_message', phone: PHONE }, () => false)).toBe('/teacher/today');
});

test('anything that is not our push: stay put', () => {
  expect(teacherRouteFor({ kind: 'promo' })).toBeNull();
  expect(teacherRouteFor(null)).toBeNull();
});

test('routeIn picks the tree; the bell screen lives in each tree', () => {
  expect(routeIn('admin', { kind: 'new_student', studentId: 's-1' })).toBe('/students/s-1');
  expect(routeIn('teacher', { kind: 'new_student', studentId: 's-1' })).toBe('/teacher/schedule');
  expect(notificationsHref('admin')).toBe('/more/notifications');
  expect(notificationsHref('teacher')).toBe('/teacher/today/notifications');
});
