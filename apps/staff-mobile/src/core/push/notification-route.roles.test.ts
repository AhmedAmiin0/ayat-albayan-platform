import { PUSH_KINDS } from '@ab/catalog';
import type { Permission } from '@ab/catalog';
import { notificationsHref, routeIn } from './notification-route';
import { assistantRouteFor, salesRouteFor } from './notification-route.roles';

const PHONE = '+966552147730';

/**
 * Does an expo-router file serve this href (`x.tsx`, `x/index.tsx`, or a `[phone].tsx` last part),
 * in the tree or in its full-screen chat group (`app/(sales-chat)/sales/…`, same URL)? A student
 * chat's id is its `channel/[id].tsx`.
 */
function routeExists(href: string, tree = ''): boolean {
  const path = href
    .replace(/\/[^/]*%2B\d+$/, '/[phone]')
    .replace(/\/channel\/[\w-]+$/, '/channel/[id]');
  const files = ['../../../app', `../../../app/(${tree}-chat)`].flatMap((root) => [`${root}${path}`, `${root}${path}/index`]);
  return files.some((file) => {
    try {
      jest.requireActual(file);
      return true;
    } catch {
      return false;
    }
  });
}

const only = (...held: Permission[]) => (p: Permission) => held.includes(p);

test.each([
  [{ kind: 'new_message', phone: PHONE }, '/sales/inbox/thread/%2B966552147730'],
  [{ kind: 'new_lead', phone: PHONE }, '/sales/inbox/thread/%2B966552147730'],
  [{ kind: 'reminder_failed' }, '/sales/inbox'],
  [{ kind: 'new_student', studentId: '5a000000-0000-4000-8000-000000000001' }, '/sales/students'],
  [{ kind: 'report_submitted', studentId: '5a000000-0000-4000-8000-000000000001' }, '/sales/students'],
  [{ kind: 'payment_due', studentId: '5a000000-0000-4000-8000-000000000001' }, '/sales/students'],
  [{ kind: 'meeting_invite', meetingId: 'm1' }, '/sales/more/meetings'],
  [{ kind: 'lesson_needs_confirmation', lessonId: 'l1' }, '/sales/today'],
  [{ kind: 'google_sync_alert' }, '/sales/more'],
  [{ kind: 'commission_earned', commissionId: 'c1' }, '/sales/more/earnings'],
  [{ kind: 'channel_message', studentId: '5a000000-0000-4000-8000-000000000001' }, '/sales/students/channel/5a000000-0000-4000-8000-000000000001'],
  [{ kind: 'channel_message', studentId: '../x' }, '/sales/students'],
])('a salesperson tapping %j opens %s', (data, href) => {
  expect(salesRouteFor(data)).toBe(href);
});

test('without inbox.read a message opens «المزيد»; without self.sales_academy a student does too', () => {
  const none = only();
  expect(salesRouteFor({ kind: 'new_message', phone: PHONE }, none)).toBe('/sales/more');
  expect(salesRouteFor({ kind: 'new_student' }, none)).toBe('/sales/more');
  expect(salesRouteFor({ kind: 'new_student' }, only('self.sales_academy'))).toBe('/sales/students');
  expect(salesRouteFor({ kind: 'meeting_invite' }, none)).toBe('/sales/more');
  expect(salesRouteFor({ kind: 'meeting_invite' }, only('meetings.read'))).toBe('/sales/more/meetings');
  expect(salesRouteFor({ kind: 'lesson_needs_confirmation' }, none)).toBe('/sales/more');
  expect(salesRouteFor({ kind: 'commission_earned' }, none)).toBe('/sales/more');
  expect(salesRouteFor({ kind: 'commission_earned' }, only('self.sales_earnings'))).toBe('/sales/more/earnings');
  expect(salesRouteFor({ kind: 'channel_message', studentId: '5a000000-0000-4000-8000-000000000001' }, none)).toBe('/sales/more');
});

test.each([
  [{ kind: 'meeting_invite', meetingId: 'm1' }, '/assistant/lessons/meetings'],
  [{ kind: 'new_message', phone: PHONE }, '/assistant/lessons'],
  [{ kind: 'lesson_needs_confirmation' }, '/assistant/lessons'],
  [{ kind: 'payment_due' }, '/assistant/lessons'],
  [{ kind: 'google_sync_alert' }, '/assistant/lessons'],
  [{ kind: 'commission_earned' }, '/assistant/lessons'],
])('an assistant tapping %j opens %s', (data, href) => {
  expect(assistantRouteFor(data)).toBe(href);
});

test('an assistant without meetings.read gets «حلقاتي»; without self.assistant «المزيد»', () => {
  expect(assistantRouteFor({ kind: 'meeting_invite' }, only('self.assistant'))).toBe('/assistant/lessons');
  expect(assistantRouteFor({ kind: 'meeting_invite' }, only('meetings.read'))).toBe('/assistant/more');
});

test.each(['sales', 'assistant'] as const)('every kind in the %s tree opens an existing route of that tree, never an admin one', (tree) => {
  const grants = [() => true, only()];
  for (const can of grants) {
    for (const kind of PUSH_KINDS) {
      const href = routeIn(tree, { kind, phone: PHONE, studentId: '5a000000-0000-4000-8000-000000000001' }, can) ?? '';
      expect(href.startsWith(`/${tree}/`)).toBe(true);
      expect(routeExists(href, tree)).toBe(true);
    }
  }
});

test('anything that is not our push: stay put', () => {
  expect(routeIn('sales', { kind: 'promo' })).toBeNull();
  expect(routeIn('assistant', null)).toBeNull();
});

test('each tree has its own bell screen, and it exists', () => {
  expect(routeExists('/sales/nowhere')).toBe(false);
  expect(notificationsHref('sales')).toBe('/sales/more/notifications');
  expect(notificationsHref('assistant')).toBe('/assistant/more/notifications');
  for (const tree of ['admin', 'teacher', 'sales', 'assistant'] as const) {
    const href = notificationsHref(tree);
    expect(routeExists(href.startsWith('/more') ? `/(tabs)${href}` : href)).toBe(true);
  }
});

test('«احجز أيام الحلقات» (owner 2026-11-06): the course wizard of that student, an existing route', () => {
  for (const kind of ['payment_received', 'payment_due'] as const) {
    const href = routeIn('sales', { kind, studentId: '5a000000-0000-4000-8000-000000000001', open: 'course' }) ?? '';
    expect(href).toBe('/sales/inbox/sales-course?studentId=5a000000-0000-4000-8000-000000000001');
    expect(routeExists(href.split('?')[0] ?? '', 'sales')).toBe(true);
  }
  // Without the inbox, or a bad id: the kind's own screen.
  expect(salesRouteFor({ kind: 'payment_received', studentId: '5a000000-0000-4000-8000-000000000001', open: 'course' }, only())).toBe('/sales/more');
  expect(salesRouteFor({ kind: 'payment_received', studentId: '../x', open: 'course' })).toBe('/sales/students');
});
