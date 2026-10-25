import { PUSH_KINDS } from '@ab/shared';
import { pushKind, pushPhone, routeFor } from './notification-route';

const PHONE = '+966552147730';
const THREAD = '/inbox/thread/%2B966552147730';

test.each([
  [{ kind: 'new_lead', phone: PHONE }, THREAD],
  [{ kind: 'new_message', phone: PHONE }, THREAD],
  [{ kind: 'reminder_failed', phone: PHONE, messageId: 'm3' }, THREAD],
  [{ kind: 'lesson_needs_confirmation', lessonId: 'l1' }, '/'],
  [{ kind: 'report_submitted', studentId: 's-1' }, '/students/s-1'],
  [{ kind: 'payment_due', studentId: 's-1', subscriptionId: 'sub1' }, '/students/s-1'],
  [{ kind: 'new_student', lessonId: 'l1', studentId: 's-1' }, '/students/s-1'],
  [{ kind: 'meeting_invite', meetingId: 'm1' }, '/more/live/meetings'],
  [{ kind: 'google_sync_alert' }, '/more/ops/settings'],
])('%j opens %s', (data, href) => {
  expect(routeFor(data)).toBe(href);
});

test('without the id a kind needs: the matching list, never a broken route', () => {
  expect(routeFor({ kind: 'new_lead' })).toBe('/inbox');
  expect(routeFor({ kind: 'new_message', phone: '0555' })).toBe('/inbox');
  expect(routeFor({ kind: 'reminder_failed', phone: 966552147730 })).toBe('/inbox');
  expect(routeFor({ kind: 'payment_due', subscriptionId: 'sub1' })).toBe('/students');
  expect(routeFor({ kind: 'report_submitted', studentId: '../more' })).toBe('/students');
  expect(routeFor({ kind: 'report_submitted', studentId: '' })).toBe('/students');
  expect(routeFor({ kind: 'new_student', studentId: '../more' })).toBe('/students');
});

test('every push kind has a destination', () => {
  for (const kind of PUSH_KINDS) expect(routeFor({ kind })).not.toBeNull();
});

test('anything that is not an admin push: stay where the app is', () => {
  expect(routeFor({ kind: 'marketing' })).toBeNull();
  expect(routeFor({})).toBeNull();
  expect(routeFor(null)).toBeNull();
  expect(routeFor(undefined)).toBeNull();
  expect(routeFor('new_lead')).toBeNull();
});

test('pushKind and pushPhone read only well-formed values', () => {
  expect(pushKind({ kind: 'payment_due' })).toBe('payment_due');
  expect(pushKind({ kind: 7 })).toBeNull();
  expect(pushPhone({ phone: PHONE })).toBe(PHONE);
  expect(pushPhone({ phone: '966552147730' })).toBeNull();
  expect(pushPhone({ phone: '+966 55 214' })).toBeNull();
  expect(pushPhone([])).toBeNull();
});

test('a push into a tab the role cannot see opens «المزيد» instead of nowhere', () => {
  const only = (held: string) => (p: string) => p === held;
  expect(routeFor({ kind: 'new_message', phone: PHONE }, only('students.read'))).toBe('/more');
  expect(routeFor({ kind: 'report_submitted', studentId: 's-1' }, only('inbox.read'))).toBe('/more');
  expect(routeFor({ kind: 'lesson_needs_confirmation' }, only('inbox.read'))).toBe('/more');
  expect(routeFor({ kind: 'new_message', phone: PHONE }, only('leads.read'))).toBe(THREAD);
  expect(routeFor({ kind: 'report_submitted', studentId: 's-1' }, only('students.read'))).toBe('/students/s-1');
  expect(routeFor({ kind: 'meeting_invite' }, only('students.read'))).toBe('/more');
  expect(routeFor({ kind: 'meeting_invite' }, only('meetings.read'))).toBe('/more/live/meetings');
  expect(routeFor({ kind: 'google_sync_alert' }, only('students.read'))).toBe('/more');
  expect(routeFor({ kind: 'google_sync_alert' }, only('settings.read'))).toBe('/more/ops/settings');
  expect(routeFor({ kind: 'nope' }, () => false)).toBeNull();
});
