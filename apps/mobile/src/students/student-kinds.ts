import {
  kindOfStatusParam,
  NOT_SUBSCRIBED_STATUSES,
  STUDENT_LIST_KINDS,
  type StudentListKind,
  type TeacherStudentCounts,
} from '@ab/shared';
import { t } from '@/lib/i18n';
import type { FilterPill } from '@/ui/FilterPills';
import { countOf, totalOf } from './student-filters';

// «مشترك · تجريبي · الكل» (owner 2026-10-12): the switch over a teacher's students, the same words
// on the sales «المعلمون» detail and the admin teacher's file (web parity).

const L = t.studentLists;

export const KIND_LABEL: Record<StudentListKind, string> = { active: L.active, trial: L.trial, all: L.all };

/** The empty line of each kind («لا يوجد طلاب مشتركون» …). */
export const KIND_EMPTY: Record<StudentListKind, string> = { active: L.emptyActive, trial: L.emptyTrial, all: L.emptyAll };

/** The switch's pills, each with its count when the API gave one (never an invented number). */
export function kindPills(counts: Partial<Record<StudentListKind, number>>): FilterPill<StudentListKind>[] {
  return STUDENT_LIST_KINDS.map((kind) => {
    const count = counts[kind];
    return { value: kind, label: KIND_LABEL[kind], ...(count === undefined ? {} : { count }) };
  });
}

/** «مشترك 3 · تجريبي 1» of a teacher row. */
export function countsLine(c: TeacherStudentCounts): string {
  return L.counts.replace('{active}', String(c.active_count)).replace('{trial}', String(c.trial_count));
}

/**
 * The switch's counts from GET /students/status-counts: «تجريبي» sums new, trial and
 * pending_subscription (owner 2026-10-15), undefined until each of them is known.
 */
export function kindCounts(counts: unknown): Partial<Record<StudentListKind, number>> {
  const parts = NOT_SUBSCRIBED_STATUSES.map((s) => countOf(counts, s));
  const trial = parts.every((n): n is number => n !== undefined) ? parts.reduce((a, b) => a + b, 0) : undefined;
  return { active: countOf(counts, 'active'), trial, all: totalOf(counts) };
}

/**
 * The kind a teacher's file opens on: the `status` route param (a tapped count: active / trial, or
 * all; or the status list a kind sends, «new,trial,pending_subscription»), «مشترك» without one or
 * with one the switch cannot show.
 */
export function presetKind(status: string | undefined): StudentListKind {
  const text = status?.trim() ?? '';
  if (text === '') return 'active';
  const named = STUDENT_LIST_KINDS.find((kind) => kind === text);
  if (named) return named;
  const listed = kindOfStatusParam(text);
  return listed === null || listed === 'all' ? 'active' : listed;
}
