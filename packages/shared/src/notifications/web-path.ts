import { PUSH_KINDS, type PushKind } from '../enums/index.js';
import { E164_RE } from '../format/phone.js';
import { HOME_BY_ROLE, type UserRole } from '../permissions/roles.js';

// Where a bell row opens on the web (R-NOT-01). `data` is PushService's { kind, ...event.data }:
// untrusted JSON, so every field is checked (E.164 phone, uuid ids) and anything else falls back
// to a safe list or the role's home. Mirrors apps/mobile/src/core/push/notification-route.ts.

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

const ROUTES: Record<PushKind, (area: Area, data: Data) => string> = {
  new_lead: inbox,
  new_message: inbox,
  reminder_failed: inbox,
  lesson_needs_confirmation: (area) => HOME_BY_ROLE[area],
  report_submitted: student,
  payment_due: student,
  // The teacher sees the new lesson on their calendar; anyone else opens the student.
  new_student: (area, data) => (area === 'teacher' ? '/teacher/calendar' : student(area, data)),
  meeting_invite: (area, data) => {
    const id = uuid(data, 'meetingId');
    return id ? `/meeting/${id}` : MEETINGS[area];
  },
  // «مزامنة Google» (docs/24, docs/26b §1); only admins get this kind.
  google_sync_alert: (area) => (area === 'admin' ? '/admin/settings/google' : HOME_BY_ROLE[area]),
  // docs/31 §2: the teacher's «رسائل الطلاب» on that student; only teachers get this kind.
  channel_message: (area, data) => {
    const id = uuid(data, 'studentId');
    if (area !== 'teacher') return HOME_BY_ROLE[area];
    return id ? `/teacher/messages?student=${id}` : '/teacher/messages';
  },
};

const isArea = (role: UserRole | null): role is Area =>
  role === 'admin' || role === 'teacher' || role === 'sales' || role === 'assistant';

/** The kind a row's data names, or null. */
export function notificationKind(data: Data): PushKind | null {
  const kind = field(data, 'kind');
  return PUSH_KINDS.find((k) => k === kind) ?? null;
}

/**
 * The web path a bell row opens for the signed-in base role: admin kinds as the app's push map
 * (inbox ?phone=, /admin, the student), new_student → the teacher's calendar (the student for
 * admins), meeting_invite → /meeting/$id (the meetings list without a valid id). A non-staff role
 * or an unknown kind → the role's home ('/' when signed out).
 */
export function webNotificationPath(data: Data, role: UserRole | null): string {
  if (!isArea(role)) return role ? HOME_BY_ROLE[role] : '/';
  const kind = notificationKind(data);
  return kind ? ROUTES[kind](role, data) : HOME_BY_ROLE[role];
}
