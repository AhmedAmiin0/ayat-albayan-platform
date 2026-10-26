import type { PushKind } from '@ab/shared';
import { canOpen, tabOpen, type TabRoute } from '@/auth/route-permissions';
import type { Can } from '@/auth/use-permissions';
import { threadHref } from '@/inbox/thread/hooks/thread-cache';
import { assistantRouteFor, salesRouteFor } from './notification-route.roles';
import { pushField, pushKind, pushPhone } from './push-data';

// Where a tapped push (or a bell row) opens (R-MOB-01, R-NOT-01); the data is checked in push-data.

/** The app's signed-in trees: admins get (tabs); teachers, sales and assistants their own routes. */
export type PushTree = 'admin' | 'teacher' | 'sales' | 'assistant';

export { pushKind, pushPhone } from './push-data';

const toThread = (data: unknown) => {
  const phone = pushPhone(data);
  return phone ? threadHref(phone) : '/inbox';
};

const toStudent = (data: unknown) => {
  const student = pushField(data, 'studentId');
  return student && /^[\w-]+$/.test(student) ? `/students/${student}` : '/students';
};

/** The internal meetings list (the room itself opens from there, in the browser). */
const ADMIN_MEETINGS = '/more/live/meetings';

/** «إعدادات الأكاديمية»: the Google sync status card is on it (docs/24 §3). */
const ADMIN_SETTINGS = '/more/ops/settings';

/**
 * new lead / new message / failed reminder → that number's thread; lesson needs confirmation →
 * Today; report submitted / payment due / new student → the student (the balance card is on that
 * screen); meeting invite → the meetings list; a Google sync alert → the settings (its status
 * card). Without the id it needs, the matching list. Typed
 * by PushKind, so a new kind must pick a screen.
 */
const ROUTES: Record<PushKind, (data: unknown) => string> = {
  new_lead: toThread,
  new_message: toThread,
  reminder_failed: toThread,
  lesson_needs_confirmation: () => '/',
  report_submitted: toStudent,
  payment_due: toStudent,
  new_student: toStudent,
  meeting_invite: () => ADMIN_MEETINGS,
  google_sync_alert: () => ADMIN_SETTINGS,
};

const tabOf = (href: string): TabRoute => (href.startsWith('/inbox') ? 'inbox' : href.startsWith('/students') ? 'students' : 'today');

/** May the role open this admin href? «المزيد» is always there; its rows need their own permission. */
function adminOpens(href: string, can: Can): boolean {
  if (href === ADMIN_MEETINGS) return can('meetings.read');
  if (href === ADMIN_SETTINGS) return canOpen(can, 'settings');
  return tabOpen(can, tabOf(href));
}

/**
 * The admin screen a tapped push opens; null for anything that is not one of our pushes (stay put).
 * A push into a screen the role cannot see (a hidden tab goes nowhere) opens «المزيد» instead.
 */
export function routeFor(data: unknown, can: Can = () => true): string | null {
  const kind = pushKind(data);
  if (!kind) return null;
  const href = ROUTES[kind](data);
  return adminOpens(href, can) ? href : '/more';
}

const TEACHER_TODAY = '/teacher/today';

const toTeacherThread = (data: unknown, can: Can) => {
  if (!canOpen(can, 'chats')) return TEACHER_TODAY;
  const phone = pushPhone(data);
  return phone ? `/teacher/chats/${encodeURIComponent(phone)}` : '/teacher/chats';
};

/**
 * The teacher tree's own routes: a message → her chat with that number (Today without inbox.read);
 * a new student → her calendar (the new lesson is on it); a report → her reports; a meeting
 * invite → her meetings; anything about a lesson or a package → Today. Never an admin URL.
 */
const TEACHER_ROUTES: Record<PushKind, (data: unknown, can: Can) => string> = {
  new_lead: toTeacherThread,
  new_message: toTeacherThread,
  reminder_failed: toTeacherThread,
  lesson_needs_confirmation: () => TEACHER_TODAY,
  report_submitted: () => '/teacher/reports',
  payment_due: () => TEACHER_TODAY,
  new_student: () => '/teacher/schedule',
  meeting_invite: () => '/teacher/more/meetings',
  // Admins only (settings.read); never sent to a teacher.
  google_sync_alert: () => TEACHER_TODAY,
};

/** The teacher screen a tapped push opens; null for anything that is not one of our pushes. */
export function teacherRouteFor(data: unknown, can: Can = () => true): string | null {
  const kind = pushKind(data);
  return kind ? TEACHER_ROUTES[kind](data, can) : null;
}

const TREE_ROUTES: Record<PushTree, (data: unknown, can: Can) => string | null> = {
  admin: routeFor,
  teacher: teacherRouteFor,
  sales: salesRouteFor,
  assistant: assistantRouteFor,
};

/** The route map of the tree the app is in (no tree falls back to another's). */
export function routeIn(tree: PushTree, data: unknown, can: Can = () => true): string | null {
  return TREE_ROUTES[tree](data, can);
}

const NOTIFICATIONS: Record<PushTree, string> = {
  admin: '/more/notifications',
  teacher: '/teacher/today/notifications',
  sales: '/sales/more/notifications',
  assistant: '/assistant/more/notifications',
};

/** The bell's own screen in each tree (a stack screen, not a tab). */
export function notificationsHref(tree: PushTree): string {
  return NOTIFICATIONS[tree];
}
