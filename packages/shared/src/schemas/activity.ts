import { z } from 'zod';
import { USER_ROLES } from '../roles.js';
import { listSortShape } from './list-sort.js';

// «سجل النشاط» (owner, 2026-10-05): GET /activity, admin only, paged (R-NFR-08). The API logs
// every mutating request + sign-in/out; this is the list's query and row shape.

/** The actor's role on a row: a user role, or 'public' for calls without a login. */
export const ACTIVITY_ROLES = [...USER_ROLES, 'public'] as const;
export type ActivityRole = (typeof ACTIVITY_ROLES)[number];

/** ok = 1xx–3xx, error = 4xx/5xx. */
export const ACTIVITY_RESULTS = ['ok', 'error'] as const;
export type ActivityResult = (typeof ACTIVITY_RESULTS)[number];

export const ACTIVITY_SORT_KEYS = ['at', 'action', 'status', 'duration_ms'] as const;
export type ActivitySortKey = (typeof ACTIVITY_SORT_KEYS)[number];
/** Column filters of the admin table (`f_<key>` in the URL, the plain key in the API query). */
export const ACTIVITY_FILTER_KEYS = ['role', 'action', 'entity', 'result'] as const;

const blank = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const trimmed = (v: unknown) => (typeof v === 'string' ? v.trim() : v);

export const activityListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  actor_id: z.preprocess(blank, z.uuid().optional()),
  role: z.preprocess(blank, z.enum(ACTIVITY_ROLES).optional()),
  /** Prefix of the action key: 'students' matches 'students.create', 'students.update', … */
  action: z.preprocess(blank, z.preprocess(trimmed, z.string().regex(/^[A-Za-z0-9_.-]{1,120}$/, 'invalid_action')).optional()),
  entity: z.preprocess(blank, z.preprocess(trimmed, z.string().regex(/^[a-z0-9_-]{1,60}$/, 'invalid_entity')).optional()),
  entity_id: z.preprocess(blank, z.string().trim().min(1).max(64).optional()),
  result: z.preprocess(blank, z.enum(ACTIVITY_RESULTS).optional()),
  /** Calendar days in the academy's zone (Asia/Riyadh), inclusive. */
  from: z.preprocess(blank, z.iso.date().optional()),
  to: z.preprocess(blank, z.iso.date().optional()),
  ...listSortShape(ACTIVITY_SORT_KEYS),
});
export type ActivityListQuery = z.output<typeof activityListQuery>;

/** One row of GET /activity (v_activity_log). */
export interface ActivityView {
  id: string;
  at: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: string;
  action: string;
  method: string;
  route: string;
  entity: string | null;
  entity_id: string | null;
  status: number;
  duration_ms: number;
  meta: Record<string, unknown>;
}

export interface ActivityPage {
  items: ActivityView[];
  total: number;
  page: number;
  pageSize: number;
}
