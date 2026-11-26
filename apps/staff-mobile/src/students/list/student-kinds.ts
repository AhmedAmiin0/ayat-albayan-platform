import {
  kindOfStatusParam,
  NOT_SUBSCRIBED_STATUSES,
  STUDENT_LIST_KINDS,
  type StudentListKind,
  type TeacherStudentCounts,
} from '@ab/shared';
import { t } from '@ab/mobile-kit';
import type { FilterPill } from '@ab/mobile-kit';
import { countOf, totalOf } from './student-filters';

// The same student-kind words on the sales teacher detail and the admin teacher file.

const L = t.studentLists;

export const KIND_LABEL: Record<StudentListKind, string> = {
  active: L.active,
  trial: L.trial,
  all: L.all,
};

export const KIND_EMPTY: Record<StudentListKind, string> = {
  active: L.emptyActive,
  trial: L.emptyTrial,
  all: L.emptyAll,
};

/** The switch's pills, each with its count when the API gave one (never an invented number). */
export function kindPills(
  counts: Partial<Record<StudentListKind, number>>,
): FilterPill<StudentListKind>[] {
  return STUDENT_LIST_KINDS.map((kind) => {
    const count = counts[kind];
    return { value: kind, label: KIND_LABEL[kind], ...(count === undefined ? {} : { count }) };
  });
}

export function countsLine(c: TeacherStudentCounts): string {
  return L.counts.replace('{active}', String(c.active_count)).replace('{trial}', String(c.trial_count));
}

/** Trial sums new, trial and pending_subscription; undefined until each is known. */
export function kindCounts(counts: unknown): Partial<Record<StudentListKind, number>> {
  const parts = NOT_SUBSCRIBED_STATUSES.map((s) => countOf(counts, s));
  const trial = parts.every((n): n is number => n !== undefined)
    ? parts.reduce((a, b) => a + b, 0)
    : undefined;
  return { active: countOf(counts, 'active'), trial, all: totalOf(counts) };
}

/** Opens on the `status` param (a kind or a status list), else subscribed. */
export function presetKind(status: string | undefined): StudentListKind {
  const text = status?.trim() ?? '';
  if (text === '') return 'active';
  const named = STUDENT_LIST_KINDS.find((kind) => kind === text);
  if (named) return named;
  const listed = kindOfStatusParam(text);
  return listed === null || listed === 'all' ? 'active' : listed;
}
