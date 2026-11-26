import type { Tables, TablesInsert, TablesUpdate } from '@ab/db';
import type { ExpenseCategoryView, ExpenseView } from '@ab/money';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { done, maybe, one, pgError, rows } from '@/common/db/errors';

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
    paid_on: row.paid_on,
    vendor: row.vendor,
    method: row.method,
    has_receipt: row.receipt_path !== null,
    recurring: row.recurring,
    is_draft: row.is_draft,
  };
}

/** All supabase access for `expenses` and `expense_categories` (service role; admin-only routes). */
@Injectable()
export class ExpensesRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Months `first`…`last` (YYYY-MM-01), inclusive; one month when equal. */
  async between(first: string, last: string): Promise<ExpenseRow[]> {
    const data = rows(await this.db
      .from('expenses')
      .select('*')
      .gte('month', first)
      .lte('month', last)
      .order('month')
      .order('category')
      .order('created_at')
      .limit(5000));
    return data;
  }

  async get(id: string): Promise<ExpenseRow | null> {
    const data = maybe(await this.db.from('expenses').select('*').eq('id', id).maybeSingle());
    return data;
  }

  async insert(row: TablesInsert<'expenses'>): Promise<ExpenseRow> {
    const data = one(await this.db.from('expenses').insert(row).select('*').single());
    return data;
  }

  async update(id: string, patch: TablesUpdate<'expenses'>): Promise<ExpenseRow> {
    const data = one(await this.db.from('expenses').update(patch).eq('id', id).select('*').single());
    return data;
  }

  async remove(id: string): Promise<void> {
    done(await this.db.from('expenses').delete().eq('id', id));
  }

  async categories(): Promise<ExpenseCategoryView[]> {
    const data = rows(await this.db
      .from('expense_categories')
      .select('key, label_ar, label_en, active')
      .order('sort')
      .order('key'));
    return data;
  }

  /** null: that key exists already. */
  async addCategory(row: TablesInsert<'expense_categories'>): Promise<ExpenseCategoryView | null> {
    const { data, error } = await this.db
      .from('expense_categories')
      .insert(row)
      .select('key, label_ar, label_en, active')
      .single();
    if (error?.code === '23505') return null;
    if (error) throw pgError(error);
    return data;
  }

  /** Recurring expenses of the previous month copied into `month` as drafts (idempotent). */
  async createRecurringDrafts(month: string): Promise<number> {
    const { data, error } = await this.db.rpc('create_recurring_expense_drafts', { p_month: month });
    if (error) throw pgError(error);
    return data;
  }
}
