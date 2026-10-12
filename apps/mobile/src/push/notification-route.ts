import { PUSH_KINDS, type PushKind } from '@ab/shared';
import { canOpen, tabOpen, type TabRoute } from '@/auth/route-permissions';
import type { Can } from '@/auth/use-permissions';
import { threadHref } from '@/inbox/thread-cache';

// Where a tapped push (or a bell row) opens (R-MOB-01, R-NOT-01). `data` is PushService's
// { kind, ...event.data } (docs/12 §6): untrusted JSON, so every field is checked before it reaches a route.

/** The app's two signed-in trees: admins get (tabs), teachers get /teacher (their own routes). */
export type PushTree = 'admin' | 'teacher';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

export function pushKind(data: unknown): PushKind | null {
  const kind = isRecord(data) ? data['kind'] : undefined;
  return PUSH_KINDS.find((k) => k === kind) ?? null;
}

function field(data: unknown, key: string): string | null {
  const value = isRecord(data) ? data[key] : undefined;
  return typeof value === 'string' && value ? value : null;
}

/** The phone a message push is about, if it carries a usable one. */
export function pushPhone(data: unknown): string | null {
  const phone = field(data, 'phone');
  return phone && /^\+\d{6,15}$/.test(phone) ? phone : null;
}

const toThread = (data: unknown) => {
  const phone = pushPhone(data);
  return phone ? threadHref(phone) : '/inbox';
};

const toStudent = (data: unknown) => {
  const student = field(data, 'studentId');
  return student && /^[\w-]+$/.test(student) ? `/students/${student}` : '/students';
};

/** The internal meetings list (the room itself opens from there, in the browser). */
export const ADMIN_MEETINGS = '/more/live/meetings';

/**
 * new lead / new message / failed reminder → that number's thread; lesson needs confirmation →
 * Today; report submitted / payment due / new student → the student (the balance card is on that
 * screen); meeting invite → the meetings list. Without the id it needs, the matching list. Typed
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
};

const tabOf = (href: string): TabRoute => (href.startsWith('/inbox') ? 'inbox' : href.startsWith('/students') ? 'students' : 'today');

/** May the role open this admin href? «المزيد» is always there; its meetings row needs meetings.read. */
function adminOpens(href: string, can: Can): boolean {
  if (href === ADMIN_MEETINGS) return can('meetings.read');
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

export const TEACHER_TODAY = '/teacher/today';

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
};

/** The teacher screen a tapped push opens; null for anything that is not one of our pushes. */
export function teacherRouteFor(data: unknown, can: Can = () => true): string | null {
  const kind = pushKind(data);
  return kind ? TEACHER_ROUTES[kind](data, can) : null;
}

/** routeFor / teacherRouteFor by the tree the app is in. */
export function routeIn(tree: PushTree, data: unknown, can: Can = () => true): string | null {
  return tree === 'teacher' ? teacherRouteFor(data, can) : routeFor(data, can);
}

/** The bell's own screen in each tree (a stack screen, not a tab). */
export function notificationsHref(tree: PushTree): string {
  return tree === 'teacher' ? '/teacher/today/notifications' : '/more/notifications';
}
