import type { StudentStatus } from '@ab/catalog';
import { parseStatusList } from '../schemas/student-filters.js';
import { isNotSubscribed, NOT_SUBSCRIBED_STATUSES, PACKAGE_ENDED_STATUSES } from './status-flow.js';

// «مشترك / تجريبي» (owner 2026-10-12): a teacher's students split by status, the same rules on the
// web, the mobile app and the API mappers (sales «المعلمون», admin teachers and students lists).

/**
 * The quick switch: subscribed (active), «تجريبي» (not subscribed yet: new, trial, pending_subscription,
 * owner 2026-10-15), or every status (pending_renewal, expired and paused included).
 */
export const STUDENT_LIST_KINDS = ['active', 'trial', 'all'] as const;
export type StudentListKind = (typeof STUDENT_LIST_KINDS)[number];

export type StudentKindCounts = Record<StudentListKind, number>;

/**
 * A teacher's CURRENT students (owner 2026-10-12, 2026-10-15): not subscribed yet (new, trial,
 * pending_subscription), subscribed, and the package ended (pending_renewal, expired: lessons keep
 * running until renewal). Teacher loads, the admin teacher panel's default view and the «needs a
 * teacher» note read this. A package-ended status is never «مشترك» in the switch below (it shows
 * under «الكل») and never «تجريبي».
 */
export const CURRENT_STUDENT_STATUSES = [
  ...NOT_SUBSCRIBED_STATUSES,
  'active',
  ...PACKAGE_ENDED_STATUSES,
] as const satisfies readonly StudentStatus[];

/** true for a current student of the teacher (see CURRENT_STUDENT_STATUSES). */
export function isCurrentStudent(status: StudentStatus | null | undefined): boolean {
  return CURRENT_STUDENT_STATUSES.some((s) => s === status);
}

/** «مشترك n · تجريبي n · الكل n» of a list of students. */
export function countByKind(list: readonly { status: StudentStatus }[]): StudentKindCounts {
  return {
    active: list.filter((s) => s.status === 'active').length,
    trial: list.filter((s) => isNotSubscribed(s.status)).length,
    all: list.length,
  };
}

/** The students of one kind, in the list's order («الكل» = the list as it is). */
export function splitByStatus<T extends { status: StudentStatus }>(list: readonly T[], kind: StudentListKind): T[] {
  if (kind === 'all') return [...list];
  return list.filter((s) => (kind === 'trial' ? isNotSubscribed(s.status) : s.status === kind));
}

/** The statuses of one kind (the API filter): «تجريبي» = new, trial, pending_subscription. */
export function statusesOfKind(kind: Exclude<StudentListKind, 'all'>): StudentStatus[] {
  return kind === 'trial' ? [...NOT_SUBSCRIBED_STATUSES] : ['active'];
}

/**
 * The `status` URL param («active», «new,trial,pending_subscription» …) as the switch shows it: none =
 * «الكل», exactly active = «مشترك», exactly the three not-subscribed statuses = «تجريبي», any other
 * combination = null (no segment selected).
 */
export function kindOfStatusParam(status: string | undefined): StudentListKind | null {
  const list = parseStatusList(status) ?? [];
  if (list.length === 0) return 'all';
  if (list.length === 1 && list[0] === 'active') return 'active';
  if (list.length === NOT_SUBSCRIBED_STATUSES.length && list.every(isNotSubscribed)) return 'trial';
  return null;
}

/** The `status` URL param a segment writes («الكل» = no param). */
export const statusParamOfKind = (kind: StudentListKind): string | undefined =>
  kind === 'all' ? undefined : statusesOfKind(kind).join(',');

const HTTP_URL = /^https?:\/\/[^\s/?#]+[^\s]*$/i;

/** An http(s) URL as it is, anything else (javascript:, a bare word, blank) null: safe to render as a link. */
export function safeHttpUrl(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text && HTTP_URL.test(text) ? text : null;
}

/** GET /teachers and GET /sales/teachers: each teacher's current students by kind (server-side counts). */
export interface TeacherStudentCounts {
  active_count: number;
  trial_count: number;
}
