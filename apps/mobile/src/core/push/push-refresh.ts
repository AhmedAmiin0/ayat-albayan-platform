import type { PushKind } from '@ab/shared';
import type { QueryKey } from '@tanstack/react-query';
import { pathKey } from '@/core/lib/query/query-keys';
import type { PushTree } from './notification-route';

// docs/48 MOBILE PUSH MAP: a foreground push refreshes the teacher's screens within seconds.
// Teacher tree only: the admin, sales and assistant trees refresh nothing more than before.
// lesson_needs_confirmation and report_submitted go only to admins, so they are left out.

const LESSONS = pathKey('/lessons');
const ME = pathKey('/teachers/me');

const TEACHER_REFRESH: Partial<Record<PushKind, readonly QueryKey[]>> = {
  lesson_rescheduled: [LESSONS, ME],
  lesson_cancelled: [LESSONS, ME],
  course_paused: [LESSONS, ME],
  course_resumed: [LESSONS, ME],
  new_student: [ME],
};

const TREE_REFRESH: Partial<Record<PushTree, Partial<Record<PushKind, readonly QueryKey[]>>>> = {
  teacher: TEACHER_REFRESH,
};

const NONE: readonly QueryKey[] = [];

/** The query keys a received push of `kind` refreshes in `tree`; [] for any other tree or kind. */
export function pushRefreshKeys(tree: PushTree, kind: PushKind | null): readonly QueryKey[] {
  return (kind && TREE_REFRESH[tree]?.[kind]) ?? NONE;
}
