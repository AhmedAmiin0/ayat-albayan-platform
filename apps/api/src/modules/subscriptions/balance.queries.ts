import type { Tables } from '@ab/db';
import type { BalanceView } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { dbError } from '../teachers/http';

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

/** An unknown package (just created, view lag impossible but typed): nothing used yet. */
export function emptyBalance(sub: { id: string; lessons_total: number }): BalanceView {
  return {
    subscription_id: sub.id,
    lessons_total: sub.lessons_total,
    lessons_used: 0,
    remaining: sub.lessons_total,
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
    if (ids.length === 0) return new Map();
    const { data, error } = await this.db
      .from('v_subscription_balance')
      .select('*')
      .in('subscription_id', [...ids]);
    if (error) throw dbError(error);
    const rows = data.map(toBalance).filter((r) => r !== null);
    return new Map(rows.map((r) => [r.subscription_id, r]));
  }

  async forStudents(studentIds: readonly string[]): Promise<BalanceRow[]> {
    if (studentIds.length === 0) return [];
    const { data, error } = await this.db
      .from('v_subscription_balance')
      .select('*')
      .in('student_id', [...studentIds]);
    if (error) throw dbError(error);
    return data.map(toBalance).filter((r) => r !== null);
  }
}
