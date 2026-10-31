import type { Tables } from '@ab/db';
import type { BalanceView } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { readChunked } from '@/common/db/read-all';

export type BalanceRow = BalanceView & { student_id: string; is_last: boolean };

/** A view row: every column is nullable in the generated types; null ids never happen. */
export function toBalance(r: Tables<'v_subscription_balance'>): BalanceRow | null {
  if (r.subscription_id === null || r.student_id === null) return null;
  return {
    subscription_id: r.subscription_id,
    student_id: r.student_id,
    lessons_total: r.lessons_total ?? 0,
    lessons_used: r.lessons_used ?? 0,
    remaining: r.remaining ?? 0,
    is_last: r.is_last ?? false,
    ended_at: r.ended_at,
    projected_end_at: r.projected_end_at,
  };
}

/** An unknown package (just created, view lag impossible but typed): only the lessons used before the platform. */
export function emptyBalance(sub: { id: string; lessons_total: number; lessons_used_before?: number }): BalanceView {
  const used = sub.lessons_used_before ?? 0;
  return {
    subscription_id: sub.id,
    lessons_total: sub.lessons_total,
    lessons_used: used,
    remaining: sub.lessons_total - used,
    ended_at: null,
    projected_end_at: null,
  };
}

/**
 * v_subscription_balance (migration 123; FIFO units, R-SUB-01/03). Service role only: under a
 * teacher's or guardian's RLS the view would give partial numbers.
 */
@Injectable()
export class BalanceQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async forSubscriptions(ids: readonly string[]): Promise<Map<string, BalanceRow>> {
    const data = await readChunked(ids, (chunk) =>
      this.db.from('v_subscription_balance').select('*').in('subscription_id', chunk),
    );
    const rows = data.map(toBalance).filter((r) => r !== null);
    return new Map(rows.map((r) => [r.subscription_id, r]));
  }

  async forStudents(studentIds: readonly string[]): Promise<BalanceRow[]> {
    const data = await readChunked(studentIds, (chunk) =>
      this.db.from('v_subscription_balance').select('*').in('student_id', chunk),
    );
    return data.map(toBalance).filter((r) => r !== null);
  }
}
