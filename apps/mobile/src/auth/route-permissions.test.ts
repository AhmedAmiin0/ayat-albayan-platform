import { PERMISSIONS } from '@ab/shared';
import { allowedRows, canOpen, ROUTE_PERMISSION, type RouteKey, tabOpen } from './route-permissions';

test('every route needs a permission that exists in the catalog', () => {
  for (const permission of Object.values(ROUTE_PERMISSION)) expect(PERMISSIONS).toContain(permission);
});

test.each<[RouteKey, string]>([
  ['today', 'lessons.read'],
  ['schedule', 'lessons.read'],
  ['inbox', 'inbox.read'],
  ['chats', 'inbox.read'],
  ['students', 'students.read'],
  ['receivables', 'receivables.read'],
  ['subscriptions', 'subscriptions.read'],
  ['payments', 'payments.read'],
  ['payouts', 'payouts.read'],
  ['expenses', 'expenses.read'],
  ['invoices', 'invoices.read'],
  ['summary', 'dashboard.read'],
  ['dashboard', 'dashboard.read'],
  ['settings', 'settings.read'],
  ['activity', 'activity.read'],
])('%s needs %s', (route, permission) => {
  expect(ROUTE_PERMISSION[route]).toBe(permission);
  expect(canOpen((p) => p === permission, route)).toBe(true);
  expect(canOpen(() => false, route)).toBe(false);
});

test('allowedRows keeps only what the role may open, in order', () => {
  const rows = [{ route: 'payments' }, { route: 'payouts' }, { route: 'expenses' }] as const;
  expect(allowedRows((p) => p !== 'payouts.read', rows)).toEqual([rows[0], rows[2]]);
  expect(allowedRows(() => false, rows)).toEqual([]);
  expect(allowedRows(() => true, rows)).toHaveLength(3);
});

test('the Inbox tab stays for leads.read alone (it hosts the leads list); other tabs follow their route', () => {
  expect(tabOpen((p) => p === 'leads.read', 'inbox')).toBe(true);
  expect(tabOpen((p) => p === 'inbox.read', 'inbox')).toBe(true);
  expect(tabOpen((p) => p === 'payments.read', 'inbox')).toBe(false);
  expect(tabOpen((p) => p === 'leads.read', 'students')).toBe(false);
  expect(tabOpen((p) => p === 'students.read', 'students')).toBe(true);
});
