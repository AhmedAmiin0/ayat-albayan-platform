import type { ExpenseCreate, ExpenseUpdate, ExpenseView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import { notFound } from '../scheduling/errors';
import { expenseInsert, expensePatch } from './expense.write';
import { ExpenseReceipts } from './expense-receipts';
import { ExpensesQueries, toExpenseView, type ExpenseRow } from './expenses.queries';

/** Expense writes (R-RPT-02, E4), each audited; the receipt path is checked before it is stored. */
@Injectable()
export class ExpensesService {
  constructor(
    private readonly expenses: ExpensesQueries,
    private readonly audit: AuditService,
    readonly receipts: ExpenseReceipts,
  ) {}

  async create(input: ExpenseCreate, actorId: string): Promise<ExpenseView> {
    if (input.receiptPath) await this.receipts.check(input.receiptPath);
    const row = await this.expenses.insert(expenseInsert(input, actorId));
    await this.audit.record({ actorId, entity: 'expenses', entityId: row.id, action: 'create', after: row });
    return toExpenseView(row);
  }

  async update(id: string, patch: Partial<ExpenseUpdate>, actorId: string): Promise<ExpenseView> {
    const before = await this.row(id);
    if (patch.receiptPath) await this.receipts.check(patch.receiptPath);
    const write = expensePatch(patch);
    const after = Object.keys(write).length > 0 ? await this.expenses.update(id, write) : before;
    await this.audit.record({ actorId, entity: 'expenses', entityId: id, action: 'update', before, after });
    if (patch.receiptPath !== undefined && before.receipt_path !== after.receipt_path) await this.receipts.discard(before.receipt_path);
    return toExpenseView(after);
  }

  async remove(id: string, actorId: string): Promise<void> {
    const before = await this.row(id);
    await this.expenses.remove(id);
    await this.audit.record({ actorId, entity: 'expenses', entityId: id, action: 'delete', before });
    await this.receipts.discard(before.receipt_path);
  }

  async receipt(id: string) {
    return this.receipts.download((await this.row(id)).receipt_path);
  }

  private async row(id: string): Promise<ExpenseRow> {
    const row = await this.expenses.get(id);
    if (!row) throw notFound('expense_not_found');
    return row;
  }
}
