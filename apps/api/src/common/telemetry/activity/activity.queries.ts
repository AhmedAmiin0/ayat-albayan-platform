import type { ActivityListQuery, ActivityPage, ActivitySortKey, ActivityView } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { dbError } from '@/common/http/http';
import { DB, type Db } from '@/common/db/db.module';
import { applySort, type SortSpec } from '@/common/list-sort';

/** Newest first by default; every key sorts server-side (R-NFR-08). */
const SORT: SortSpec<ActivitySortKey> = {
  columns: {
    at: { column: 'at' },
    action: { column: 'action' },
    status: { column: 'status' },
    duration_ms: { column: 'duration_ms' },
  },
  fallback: { column: 'at', ascending: false },
};

/** The academy's calendar day (Asia/Riyadh, UTC+3 all year) → its UTC bounds. */
const RIYADH = '+03:00';
const dayStart = (day: string): string => `${day}T00:00:00${RIYADH}`;
export function nextDayStart(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return dayStart(d.toISOString().slice(0, 10));
}

/** `like` prefix with the wildcards escaped ('students_x' matches literally). */
export const likePrefix = (value: string): string => `${value.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

type Row = {
  [K in keyof ActivityView]: ActivityView[K] | null;
};

/** The view's columns are typed nullable (PostgREST); the table's are not, so these never fire. */
const text = (v: string | null): string => v ?? '';
const num = (v: number | null): number => v ?? 0;

function toView(r: Row): ActivityView {
  const meta = r.meta !== null && typeof r.meta === 'object' && !Array.isArray(r.meta) ? r.meta : {};
  return {
    id: text(r.id),
    at: text(r.at),
    actor_id: r.actor_id,
    actor_name: r.actor_name,
    actor_role: r.actor_role ?? 'public',
    action: text(r.action),
    method: text(r.method),
    route: text(r.route),
    entity: r.entity,
    entity_id: r.entity_id,
    status: num(r.status),
    duration_ms: num(r.duration_ms),
    meta,
  };
}

/** GET /activity: one page of v_activity_log (service role; the controller is admin only). */
@Injectable()
export class ActivityQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list(f: ActivityListQuery): Promise<ActivityPage> {
    const from = (f.page - 1) * f.pageSize;
    let q = this.db.from('v_activity_log').select('*', { count: 'exact' });
    if (f.actor_id) q = q.eq('actor_id', f.actor_id);
    if (f.role) q = q.eq('actor_role', f.role);
    if (f.action) q = q.like('action', likePrefix(f.action));
    if (f.entity) q = q.eq('entity', f.entity);
    if (f.entity_id) q = q.eq('entity_id', f.entity_id);
    if (f.result === 'ok') q = q.lt('status', 400);
    if (f.result === 'error') q = q.gte('status', 400);
    if (f.from) q = q.gte('at', dayStart(f.from));
    if (f.to) q = q.lt('at', nextDayStart(f.to));
    const { data, count, error } = await applySort(q, f, SORT)
      .order('id')
      .range(from, from + f.pageSize - 1)
      .returns<Row[]>();
    if (error) throw dbError(error);
    return { items: data.map(toView), total: count ?? 0, page: f.page, pageSize: f.pageSize };
  }
}
