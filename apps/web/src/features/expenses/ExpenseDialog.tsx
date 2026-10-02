import { CURRENCY_ISOS, EXPENSE_CATEGORIES, type ExpenseCategory } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { FormAlert } from '@/components/ui/form-alert';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { MONEY_KEY } from '@/features/subscriptions/api';
import { apiErrorText, currencySymbol } from '@/features/subscriptions/format';
import { t } from '@/lib/i18n';
import { saveExpense, type ExpenseView } from './api';

/** The owner's tracker is in EGP; the site currencies are there for ads paid abroad. */
const CURRENCIES = ['EGP', ...CURRENCY_ISOS] as const;

type Props = { month: string; expense: ExpenseView | null; onClose: () => void; onSaved: () => void };

/** Add or edit one month's expense (R-RPT-02): category, amount, currency, note. */
export function ExpenseDialog({ month, expense, onClose, onSaved }: Props) {
  const queryClient = useQueryClient();
  const formId = useId();
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? 'ads');
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '');
  const [currency, setCurrency] = useState(expense?.currency ?? 'EGP');
  const [note, setNote] = useState(expense?.note ?? '');
  const save = useMutation({
    mutationFn: saveExpense,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MONEY_KEY });
      onSaved();
    },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body = { month: expense?.month ?? month, category, amount: Number(amount), currency, note: note.trim() || null };
    if (body.amount > 0) save.mutate({ id: expense?.id ?? null, body });
  };

  return (
    <Dialog
      title={expense ? t.common.edit : t.expenses.add}
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={formId} disabled={save.isPending}>
            {save.isPending ? t.common.saving : t.common.save}
          </Button>
        </>
      }
    >
      <form id={formId} className="grid gap-4 sm:grid-cols-2" onSubmit={submit} noValidate>
        <Field label={t.expenses.category}>
          {(p) => (
            <Select {...p} value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t.enums.expenseCategory[c]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t.expenses.amount}>
          {(p) => (
            <Input {...p} type="number" inputMode="decimal" dir="ltr" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          )}
        </Field>
        <Field label={t.expenses.currency}>
          {(p) => (
            <Select {...p} value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {`${currencySymbol(c)} (${c})`}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t.expenses.note}>{(p) => <Input {...p} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
        {save.isError && <FormAlert className="sm:col-span-2">{apiErrorText(save.error, t.expenses.error)}</FormAlert>}
      </form>
    </Dialog>
  );
}
