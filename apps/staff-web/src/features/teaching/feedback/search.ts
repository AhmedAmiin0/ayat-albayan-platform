import { FEEDBACK_SORT_KEYS } from '@ab/shared';
import type { ServerListKeys } from '@/lib/list/server-list-search';

// URL state of the feedback lists (R-NFR-08): `page`, `sort`, `dir`, `f_<key>`; the keys are the
// GET /feedback params, so `sortFilterParams` sends them as they are.

/** /admin/feedback: every column filters. */
export const FEEDBACK_LIST_KEYS: ServerListKeys = {
  sort: FEEDBACK_SORT_KEYS,
  filters: ['student', 'teacher', 'kind', 'quick_rating', 'rating', 'recommend', 'note'],
};

/** /teacher/feedback: the teacher is the login, so no teacher column. */
export const MY_FEEDBACK_LIST_KEYS: ServerListKeys = {
  sort: FEEDBACK_SORT_KEYS.filter((k) => k !== 'teacher'),
  filters: FEEDBACK_LIST_KEYS.filters.filter((k) => k !== 'teacher'),
};
