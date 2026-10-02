import type { Tables, TablesInsert, TablesUpdate } from '@ab/db';
import type { ExpenseView } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { dbError } from '../teachers/http';

export type ExpenseRow = Tables<'expenses'>;

export function toExpenseView(row: ExpenseRow): ExpenseView {
  return {
    id: row.id,
    month: row.month.slice(0, 7),
    category: row.category,
    amount: Number(row.amount),
    currency: row.currency,
    note: row.note,
    created_at: row.created_at,
  };
}

/** All supabase access for `expenses` (service role; admin-only routes). R-RPT-02, issue E4. */
@Injectable()
export class ExpensesQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** `month` is the first day (YYYY-MM-01). */
  async forMonth(month: string): Promise<ExpenseRow[]> {
    const { data, error } = await this.db
      .from('expenses')
      .select('*')
      .eq('month', month)
      .order('category')
      .order('created_at');
    if (error) throw dbError(error);
    return data;
  }

  async get(id: string): Promise<ExpenseRow | null> {
    const { data, error } = await this.db.from('expenses').select('*').eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  async insert(row: TablesInsert<'expenses'>): Promise<ExpenseRow> {
    const { data, error } = await this.db.from('expenses').insert(row).select('*').single();
    if (error) throw dbError(error);
    return data;
  }

  async update(id: string, patch: TablesUpdate<'expenses'>): Promise<ExpenseRow> {
    const { data, error } = await this.db.from('expenses').update(patch).eq('id', id).select('*').single();
    if (error) throw dbError(error);
    return data;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.db.from('expenses').delete().eq('id', id);
    if (error) throw dbError(error);
  }
}
