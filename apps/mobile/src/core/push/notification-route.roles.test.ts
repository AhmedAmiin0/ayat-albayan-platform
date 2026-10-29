import { PUSH_KINDS } from '@ab/shared';
import type { Permission } from '@ab/shared';
import { notificationsHref, routeIn } from './notification-route';
import { assistantRouteFor, salesRouteFor } from './notification-route.roles';

const PHONE = '+966552147730';

/**
 * Does an expo-router file serve this href (`x.tsx`, `x/index.tsx`, or a `[phone].tsx` last segment),
 * in the tree or in its full-screen chat group (`app/(sales-chat)/sales/…`, same URL)?
 */
function routeExists(href: string, tree = ''): boolean {
  const path = href.replace(/\/[^/]*%2B\d+$/, '/[phone]');
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
  [{ kind: 'new_student', studentId: 's-1' }, '/sales/students'],
  [{ kind: 'report_submitted', studentId: 's-1' }, '/sales/students'],
  [{ kind: 'payment_due', studentId: 's-1' }, '/sales/students'],
  [{ kind: 'meeting_invite', meetingId: 'm1' }, '/sales/more/meetings'],
  [{ kind: 'lesson_needs_confirmation', lessonId: 'l1' }, '/sales/today'],
  [{ kind: 'google_sync_alert' }, '/sales/more'],
  [{ kind: 'commission_earned', commissionId: 'c1' }, '/sales/more/earnings'],
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
      const href = routeIn(tree, { kind, phone: PHONE, studentId: 's-1' }, can) ?? '';
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
