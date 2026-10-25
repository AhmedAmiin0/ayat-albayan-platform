import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/form/button';
import { Cartouche } from '@/components/ui/display/cartouche';
import { EmptyState } from '@/components/ui/display/empty-state';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Icon } from '@/components/ui/display/icon';
import { PageHead } from '@/components/ui/layout/page';
import { Toast } from '@/components/ui/overlay/toast';
import { downloadCsv } from '@/features/exports/api';
import { ConfirmDialog } from '@/features/payments/ConfirmDialog';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { currentMonth } from '@/features/payouts/api';
import { MonthSelect } from '@/features/payouts/MonthSelect';
import { MONEY_KEY } from '@/features/subscriptions/api';
import { Amount } from '@/features/subscriptions/Amount';
import { t } from '@/lib/i18n';
import { categoriesQuery, categoryLabel, confirmDraft, deleteExpense, expenseReceiptUrl, expensesQuery, totalsByCurrency, type ExpenseView } from './api';
import { ExpenseDialog } from './ExpenseDialog';
import type { ExpenseAction } from './ExpenseActions';
import { expenseColumns } from './expense-columns';
import { ExpenseYearTable } from './ExpenseYearTable';
import { TableBox } from '@/components/TableBox';

type Props = { month: string; onMonth: (month: string) => void };

/** /admin/expenses (R-RPT-02, E4): a month's expenses (drafts to confirm; every column sorts/filters), or the 12-month table; CSV. */
export function ExpensesPage({ month, onMonth }: Props) {
  const queryClient = useQueryClient();
  const list = useQuery(expensesQuery(month));
  const categories = useQuery(categoriesQuery);
  const [year, setYear] = useState(false);
  const [editing, setEditing] = useState<ExpenseView | 'new' | null>(null);
  const [removing, setRemoving] = useState<ExpenseView | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: MONEY_KEY });
  const remove = useMutation({ mutationFn: deleteExpense, onSuccess: async () => (setRemoving(null), await refresh()) });
  const confirm = useMutation({ mutationFn: confirmDraft, onSuccess: refresh });
  const receipt = useMutation({ mutationFn: expenseReceiptUrl, onSuccess: (r) => void window.open(r.url, '_blank', 'noopener') });
  const csv = useMutation({ mutationFn: () => downloadCsv({ kind: 'expenses', params: year ? { year: month.slice(0, 4) } : { month } }) });
  const rows = useMemo(() => list.data ?? [], [list.data]);
  const label = (key: string) => categoryLabel(categories.data, key);
  const [confirmDraftOf, openReceipt] = [confirm.mutate, receipt.mutate];
  const columns = useMemo(() => {
    const name = (key: string) => categoryLabel(categories.data, key);
    const labels = [...new Set(rows.map((e) => name(e.category)))].map((l) => ({ value: l, label: l }));
    const act = (e: ExpenseView, action: ExpenseAction) => {
      if (action === 'edit') setEditing(e);
      else if (action === 'delete') setRemoving(e);
      else if (action === 'confirm') confirmDraftOf(e.id);
      else openReceipt(e.id);
    };
    return expenseColumns({ label: name, categories: labels, onAction: act });
  }, [rows, categories.data, confirmDraftOf, openReceipt]);

  return (
    <>
      <PageHead>
        <Cartouche>{t.expenses.title}</Cartouche>
        <MonthSelect label={t.expenses.month} value={month} latest={currentMonth()} onChange={onMonth} />
        <Button type="button" variant="ghost" aria-pressed={year} onClick={() => setYear((y) => !y)}>
          {year ? t.finance.monthView : t.finance.yearView.replace('{year}', month.slice(0, 4))}
        </Button>
        <div className="ms-auto flex flex-wrap gap-2.5">
          <Button type="button" variant="secondary" disabled={csv.isPending} onClick={() => csv.mutate()}>
            {t.payouts.exportCsv}
          </Button>
          <Button onClick={() => setEditing('new')}>
            <Icon name="plus" />
            {t.expenses.add}
          </Button>
        </div>
      </PageHead>
      {(list.isError || confirm.isError || receipt.isError || csv.isError) && <FormAlert>{t.common.error}</FormAlert>}
      {year ? (
        <ExpenseYearTable year={month.slice(0, 4)} />
      ) : (
        <>
          {list.isPending && <ListSkeleton />}
          {list.isSuccess && rows.length === 0 && (
            <TableBox center>
              <EmptyState title={t.expenses.empty} />
            </TableBox>
          )}
          {rows.length > 0 && (
            <DataTable fill stacked clientSort clientFilter columns={columns} data={rows} getRowId={(e) => e.id} />
          )}
          {rows.length > 0 && (
            <p className="mt-3 flex flex-wrap justify-end gap-x-4 border-t border-rule pt-3 text-sm">
              <span className="text-ink-3">{t.expenses.total}</span>
              {totalsByCurrency(rows).map(([currency, amount]) => (
                <Amount key={currency} amount={amount} currency={currency} className="font-semibold" />
              ))}
            </p>
          )}
        </>
      )}
      {editing && (
        <ExpenseDialog
          month={month}
          expense={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => (setEditing(null), setToast(t.expenses.saved))}
        />
      )}
      {removing && (
        <ConfirmDialog
          title={t.expenses.deleteConfirm}
          confirmLabel={t.common.delete}
          pending={remove.isPending}
          error={remove.isError ? t.common.error : null}
          onConfirm={() => remove.mutate(removing.id)}
          onClose={() => setRemoving(null)}
        >
          <p className="text-sm text-ink-2">
            {label(removing.category)} · <Amount amount={removing.amount} currency={removing.currency} />
          </p>
        </ConfirmDialog>
      )}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
