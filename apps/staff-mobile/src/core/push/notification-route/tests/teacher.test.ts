import { PUSH_KINDS } from '@ab/catalog';
import { isThreadHref } from '@/core/nav/chat-groups';
import { notificationsHref, routeIn, teacherRouteFor } from '@/core/push/notification-route/notification-route';

const PHONE = '+966552147730';

test.each([
  [{ kind: 'new_message', phone: PHONE }, '/teacher/chats/%2B966552147730'],
  [{ kind: 'new_lead' }, '/teacher/chats'],
  [{ kind: 'lesson_needs_confirmation', lessonId: 'l1' }, '/teacher/today'],
  [{ kind: 'report_submitted', studentId: '5a000000-0000-4000-8000-000000000001' }, '/teacher/reports'],
  [{ kind: 'payment_due', studentId: '5a000000-0000-4000-8000-000000000001' }, '/teacher/today'],
  [{ kind: 'new_student', lessonId: 'l1', studentId: '5a000000-0000-4000-8000-000000000001' }, '/teacher/schedule'],
  [{ kind: 'meeting_invite', meetingId: 'm1' }, '/teacher/more/meetings'],
  [{ kind: 'google_sync_alert' }, '/teacher/today'],
  [{ kind: 'commission_earned' }, '/teacher/today'],
])('a teacher tapping %j opens %s', (data, href) => {
  expect(teacherRouteFor(data)).toBe(href);
});

test('every kind opens a teacher route, never an admin one', () => {
  for (const kind of PUSH_KINDS) expect(teacherRouteFor({ kind, studentId: '5a000000-0000-4000-8000-000000000001' })).toMatch(/^\/teacher\//);
});

test('a message push without inbox.read opens her Today, not a hidden tab', () => {
  expect(teacherRouteFor({ kind: 'new_message', phone: PHONE }, () => false)).toBe('/teacher/today');
});

test('anything that is not our push: stay put', () => {
  expect(teacherRouteFor({ kind: 'promo' })).toBeNull();
  expect(teacherRouteFor(null)).toBeNull();
});

test('routeIn picks the tree; the bell screen lives in each tree', () => {
  expect(routeIn('admin', { kind: 'new_student', studentId: '5a000000-0000-4000-8000-000000000001' })).toBe('/students/5a000000-0000-4000-8000-000000000001');
  expect(routeIn('teacher', { kind: 'new_student', studentId: '5a000000-0000-4000-8000-000000000001' })).toBe('/teacher/schedule');
  expect(notificationsHref('admin')).toBe('/more/notifications');
  expect(notificationsHref('teacher')).toBe('/teacher/today/notifications');
});

test('a family message in a student channel opens «رسائل الطلاب» on that student (docs/31 §2)', () => {
  expect(teacherRouteFor({ kind: 'channel_message', studentId: '5a000000-0000-4000-8000-000000000001' })).toBe('/teacher/more/messages/5a000000-0000-4000-8000-000000000001');
  expect(teacherRouteFor({ kind: 'channel_message' })).toBe('/teacher/more/messages');
  expect(teacherRouteFor({ kind: 'channel_message', studentId: '../x' })).toBe('/teacher/more/messages');
  // A chat (app/(teacher-chat)): pushed as is, above her tabs; the list stays a tab screen.
  expect(isThreadHref('/teacher/more/messages/5a000000-0000-4000-8000-000000000001')).toBe(true);
  expect(isThreadHref('/teacher/more/messages')).toBe(false);
});
