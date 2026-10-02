import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Cartouche } from '@/components/ui/cartouche';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { FormAlert } from '@/components/ui/form-alert';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { PageHead } from '@/components/ui/page';
import { Toast } from '@/components/ui/toast';
import { MONEY_KEY } from '@/features/subscriptions/api';
import { Amount } from '@/features/subscriptions/Amount';
import { t } from '@/lib/i18n';
import { deleteExpense, expensesQuery, totalsByCurrency, type ExpenseView } from './api';
import { ExpenseDialog } from './ExpenseDialog';

type Props = { month: string; onMonth: (month: string) => void };

/** /admin/expenses (R-RPT-02, E4): ads / content / tools spend per month, totals per currency. */
export function ExpensesPage({ month, onMonth }: Props) {
  const queryClient = useQueryClient();
  const list = useQuery(expensesQuery(month));
  const [editing, setEditing] = useState<ExpenseView | 'new' | null>(null);
  const [removing, setRemoving] = useState<ExpenseView | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const remove = useMutation({
    mutationFn: deleteExpense,
    onSuccess: async () => {
      setRemoving(null);
      await queryClient.invalidateQueries({ queryKey: MONEY_KEY });
    },
  });
  const rows = list.data ?? [];

  return (
    <>
      <PageHead>
        <Cartouche>{t.expenses.title}</Cartouche>
        <Field label={t.expenses.month}>
          {(p) => <Input {...p} type="month" dir="ltr" className="w-auto" value={month} onChange={(e) => e.target.value && onMonth(e.target.value)} />}
        </Field>
        <div className="ms-auto">
          <Button onClick={() => setEditing('new')}>
            <Icon name="plus" />
            {t.expenses.add}
          </Button>
        </div>
      </PageHead>
      {list.isError && <FormAlert>{t.common.error}</FormAlert>}
      {list.isPending && <p className="py-6 text-center text-ink-3">{t.common.loading}</p>}
      {list.isSuccess && rows.length === 0 && <EmptyState title={t.expenses.empty} />}
      <ul className="grid divide-y divide-rule">
        {rows.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
            <span className="min-w-28 font-semibold text-ink">{t.enums.expenseCategory[e.category]}</span>
            <Amount amount={e.amount} currency={e.currency} />
            <span className="min-w-0 flex-1 text-sm text-ink-2">{e.note}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(e)}>
              {t.common.edit}
            </Button>
            <Button type="button" variant="danger-quiet" size="sm" onClick={() => setRemoving(e)}>
              {t.common.delete}
            </Button>
          </li>
        ))}
      </ul>
      {rows.length > 0 && (
        <p className="mt-3 flex flex-wrap justify-end gap-x-4 border-t-[3px] border-double border-gold pt-3 text-sm">
          <span className="text-ink-3">{t.expenses.total}</span>
          {totalsByCurrency(rows).map(([currency, amount]) => (
            <Amount key={currency} amount={amount} currency={currency} className="font-semibold" />
          ))}
        </p>
      )}
      {editing && (
        <ExpenseDialog
          month={month}
          expense={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setToast(t.expenses.saved);
          }}
        />
      )}
      {removing && (
        <Dialog
          title={t.expenses.deleteConfirm}
          onClose={() => setRemoving(null)}
          actions={
            <>
              <Button type="button" variant="ghost" onClick={() => setRemoving(null)}>
                {t.common.cancel}
              </Button>
              <Button type="button" variant="danger" disabled={remove.isPending} onClick={() => remove.mutate(removing.id)}>
                {t.common.delete}
              </Button>
            </>
          }
        >
          <p className="text-sm text-ink-2">
            {t.enums.expenseCategory[removing.category]} · <Amount amount={removing.amount} currency={removing.currency} />
          </p>
        </Dialog>
      )}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
