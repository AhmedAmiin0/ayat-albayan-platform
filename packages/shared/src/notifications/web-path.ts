import { ALL_PUSH_KINDS, HOME_BY_ROLE, type AnyPushKind, type UserRole } from '@ab/catalog';
import { E164_RE } from '@ab/core';
import { OPEN_COURSE } from './course-notice';

// Where a bell row opens on the web (R-NOT-01). `data` is PushService's { kind, ...event.data }:
// untrusted JSON, so every field is checked (E.164 phone, uuid ids) and anything else falls back
// to a safe list or the role's home. Mirrors apps/staff-mobile/src/core/push/notification-route.ts.

type Area = 'admin' | 'teacher' | 'sales' | 'assistant';
type Data = Readonly<Record<string, unknown>> | null | undefined;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const field = (data: Data, key: string): string | null => {
  const v = data?.[key];
  return typeof v === 'string' ? v : null;
};
const uuid = (data: Data, key: string): string | null => {
  const v = field(data, key);
  return v && UUID_RE.test(v) ? v : null;
};
const phone = (data: Data): string | null => {
  const v = field(data, 'phone');
  return v && E164_RE.test(v) ? v : null;
};

function inbox(area: Area, data: Data): string {
  if (area === 'assistant') return HOME_BY_ROLE.assistant;
  const p = phone(data);
  return p ? `/${area}/inbox?phone=${encodeURIComponent(p)}` : `/${area}/inbox`;
}

function student(area: Area, data: Data): string {
  const id = uuid(data, 'studentId');
  if (area === 'admin') return id ? `/admin/students/${id}` : '/admin/students';
  if (area === 'teacher') return '/teacher/students';
  return area === 'sales' ? '/sales/students' : HOME_BY_ROLE.assistant;
}

const MEETINGS: Record<Area, string> = {
  admin: '/admin/classrooms',
  teacher: '/teacher',
  sales: '/sales/meetings',
  assistant: '/assistant',
};

/** A chat message (docs/31 §2) opens that student's chat for teacher or assistant. */
const CHANNEL: Record<Area, (studentId: string | null) => string> = {
  teacher: (id) => (id ? `/teacher/messages?student=${id}` : '/teacher/messages'),
  sales: (id) => (id ? `/sales/students?student=${id}` : '/sales/students'),
  admin: () => HOME_BY_ROLE.admin,
  assistant: () => HOME_BY_ROLE.assistant,
};

/** The teacher sees the lesson on their calendar; anyone else opens the student. */
const lessonPath = (area: Area, data: Data): string =>
  area === 'teacher' ? '/teacher/calendar' : student(area, data);

const ROUTES: Record<AnyPushKind, (area: Area, data: Data) => string> = {
  new_lead: inbox,
  new_message: inbox,
  reminder_failed: inbox,
  lesson_needs_confirmation: (area) => HOME_BY_ROLE[area],
  report_submitted: student,
  payment_due: student,
  new_student: lessonPath,
  meeting_invite: (area, data) => {
    const id = uuid(data, 'meetingId');
    return id ? `/meeting/${id}` : MEETINGS[area];
  },
  // Google sync (docs/24, docs/26b §1); only admins get this kind.
  google_sync_alert: (area) => (area === 'admin' ? '/admin/settings/google' : HOME_BY_ROLE[area]),
  channel_message: (area, data) => CHANNEL[area](uuid(data, 'studentId')),
  // The salesperson's wallet; only sales get this kind.
  commission_earned: (area) => (area === 'sales' ? '/sales/earnings' : HOME_BY_ROLE[area]),
  // A schedule change: the lesson on the teacher's calendar, else the student.
  lesson_rescheduled: lessonPath,
  lesson_cancelled: lessonPath,
  course_paused: lessonPath,
  course_resumed: lessonPath,
  // A payment came in: the student (their balance).
  payment_received: student,
  // The family app's kinds (docs/50 §5.6) reach only portal logins (their home, '/portal'); a
  // staff area never gets them, so it opens its home.
  lesson_starting: (area) => HOME_BY_ROLE[area],
  lesson_live: (area) => HOME_BY_ROLE[area],
  report_sent: (area) => HOME_BY_ROLE[area],
  lesson_request_declined: (area) => HOME_BY_ROLE[area],
};

/** The family chat with the wizard open, else the student. */
function coursePath(area: Area, data: Data): string {
  const id = uuid(data, 'studentId');
  const p = phone(data);
  const chat = area === 'sales' && id && p;
  return chat ? `/sales/inbox?phone=${encodeURIComponent(p)}&course=${id}` : student(area, data);
}

const opensCourse = (data: Data): boolean => field(data, 'open') === OPEN_COURSE;

const isArea = (role: UserRole | null): role is Area =>
  role === 'admin' || role === 'teacher' || role === 'sales' || role === 'assistant';

/** The kind a row's data names, or null. */
export function notificationKind(data: Data): AnyPushKind | null {
  const kind = field(data, 'kind');
  return ALL_PUSH_KINDS.find((k) => k === kind) ?? null;
}

/**
 * The web path a bell row opens for the signed-in base role: admin kinds as the app's push map
 * (inbox ?phone=, /admin, the student), new_student → the teacher's calendar (the student for
 * admins), meeting_invite → /meeting/$id (the meetings list without a valid id). A non-staff role
 * (a family login: '/portal', where lesson_starting and report_sent land) or an unknown kind → the
 * role's home ('/' when signed out).
 */
export function webNotificationPath(data: Data, role: UserRole | null): string {
  if (!isArea(role)) return role ? HOME_BY_ROLE[role] : '/';
  const kind = notificationKind(data);
  if (!kind) return HOME_BY_ROLE[role];
  return opensCourse(data) ? coursePath(role, data) : ROUTES[kind](role, data);
}
