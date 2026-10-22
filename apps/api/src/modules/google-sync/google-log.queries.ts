import type { GooglePlannedRequest, GoogleSkipReason, GoogleSyncItemView, GoogleSyncKind, GoogleSyncState } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { DB, type Db } from '../../common/db/db.module';
import { localDate } from './sheet-dates';
import { TZ } from './google-format';

const planned = z.object({ method: z.string(), target: z.string(), summary: z.string() });
type Raw = {
  id: string; kind: GoogleSyncKind; state: GoogleSyncState; skip_reason: string | null; google_id: string | null; attempts: number;
  last_error: string | null; planned: unknown; updated_at: string; lesson_id: string | null; student_id: string | null;
};

/** The sync log (GET /admin/google/items): the last 100 rows, each named by its student and date. */
@Injectable()
export class GoogleLogQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async recent(limit = 100): Promise<GoogleSyncItemView[]> {
    const { data, error } = await this.db
      .from('google_sync_items')
      .select('id, kind, state, skip_reason, google_id, attempts, last_error, planned, updated_at, lesson_id, student_id')
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(`google log read failed: ${error.message}`);
    return this.view(data as Raw[]);
  }

  async one(id: string): Promise<GoogleSyncItemView | null> {
    const { data, error } = await this.db
      .from('google_sync_items')
      .select('id, kind, state, skip_reason, google_id, attempts, last_error, planned, updated_at, lesson_id, student_id')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`google log read failed: ${error.message}`);
    return data ? ((await this.view([data as Raw]))[0] ?? null) : null;
  }

  private async view(rows: Raw[]): Promise<GoogleSyncItemView[]> {
    const lessonIds = [...new Set(rows.map((r) => r.lesson_id).filter((x): x is string => !!x))];
    const [lessons, people] = await Promise.all([
      lessonIds.length ? this.db.from('lessons').select('id, starts_at, lesson_students(student_id)').in('id', lessonIds) : Promise.resolve({ data: [], error: null }),
      this.studentNames(rows, lessonIds),
    ]);
    if (lessons.error) throw new Error(`google log lessons failed: ${lessons.error.message}`);
    const lessonOf = new Map((lessons.data ?? []).map((l) => [l.id, l]));
    return rows.map((r) => {
      const l = r.lesson_id ? lessonOf.get(r.lesson_id) : undefined;
      const ids = r.student_id ? [r.student_id] : (l?.lesson_students ?? []).map((s) => s.student_id);
      const who = ids.map((id) => people.get(id)).filter(Boolean).join('، ');
      const when = l && r.kind !== 'summary_row' ? localDate(l.starts_at, TZ) : '';
      const plan = planned.safeParse(r.planned);
      return {
        id: r.id, kind: r.kind, state: r.state, skip_reason: (r.skip_reason ?? null) as GoogleSkipReason | null,
        subject: [who, when].filter(Boolean).join(' · '), google_id: r.google_id, attempts: r.attempts, last_error: r.last_error,
        planned: plan.success ? (plan.data as GooglePlannedRequest) : null, updated_at: new Date(r.updated_at).toISOString(),
      };
    });
  }

  private async studentNames(rows: Raw[], lessonIds: string[]): Promise<Map<string, string>> {
    const direct = rows.map((r) => r.student_id).filter((x): x is string => !!x);
    const linked = lessonIds.length ? await this.db.from('lesson_students').select('student_id').in('lesson_id', lessonIds) : { data: [], error: null };
    if (linked.error) throw new Error(`google log students failed: ${linked.error.message}`);
    const ids = [...new Set([...direct, ...(linked.data ?? []).map((s) => s.student_id)])];
    if (!ids.length) return new Map();
    const { data, error } = await this.db.from('students').select('id, name').in('id', ids);
    if (error) throw new Error(`google log students failed: ${error.message}`);
    return new Map(data.map((s) => [s.id, s.name]));
  }
}
