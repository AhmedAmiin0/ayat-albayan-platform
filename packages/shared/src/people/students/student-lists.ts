import type { StudentStatus } from '@ab/catalog';
import { parseStatusList } from '../schemas/student-filters.js';
import { isNotSubscribed, NOT_SUBSCRIBED_STATUSES, PACKAGE_ENDED_STATUSES } from './status-flow/index.js';

// A teacher's students split by status with one rule for web, mobile and the API mappers.

/** Subscribed, not subscribed yet (new, trial, pending_subscription), or every status. */
export const STUDENT_LIST_KINDS = ['active', 'trial', 'all'] as const;
export type StudentListKind = (typeof STUDENT_LIST_KINDS)[number];

export type StudentKindCounts = Record<StudentListKind, number>;

/** Current includes package-ended students, whose lessons run until renewal. */
export const CURRENT_STUDENT_STATUSES = [
  ...NOT_SUBSCRIBED_STATUSES,
  'active',
  ...PACKAGE_ENDED_STATUSES,
] as const satisfies readonly StudentStatus[];

/** true for a current student of the teacher (see CURRENT_STUDENT_STATUSES). */
export function isCurrentStudent(status: StudentStatus | null | undefined): boolean {
  return CURRENT_STUDENT_STATUSES.some((s) => s === status);
}

export function countByKind(list: readonly { status: StudentStatus }[]): StudentKindCounts {
  return {
    active: list.filter((s) => s.status === 'active').length,
    trial: list.filter((s) => isNotSubscribed(s.status)).length,
    all: list.length,
  };
}

/** The students of one kind, in the list's order ('all' is the list as it is). */
export function splitByStatus<T extends { status: StudentStatus }>(list: readonly T[], kind: StudentListKind): T[] {
  if (kind === 'all') return [...list];
  return list.filter((s) => (kind === 'trial' ? isNotSubscribed(s.status) : s.status === kind));
}

/** The statuses of one kind for the API filter. */
export function statusesOfKind(kind: Exclude<StudentListKind, 'all'>): StudentStatus[] {
  return kind === 'trial' ? [...NOT_SUBSCRIBED_STATUSES] : ['active'];
}

/** Maps the `status` URL param to a segment; any other combination is null (none selected). */
export function kindOfStatusParam(status: string | undefined): StudentListKind | null {
  const list = parseStatusList(status) ?? [];
  if (list.length === 0) return 'all';
  if (list.length === 1 && list[0] === 'active') return 'active';
  if (list.length === NOT_SUBSCRIBED_STATUSES.length && list.every(isNotSubscribed)) return 'trial';
  return null;
}

/** The `status` URL param a segment writes ('all' writes none). */
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
