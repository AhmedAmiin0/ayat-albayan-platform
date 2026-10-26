import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { FormAlert } from '@/components/ui/form/form-alert';
import { paidAtDay } from '@/features/finance/payments/record/pay-day';
import { ReceiptField, receiptProblem } from '@/features/finance/payments/attachments/ReceiptField';
import { MONEY_KEY } from '@/features/finance/subscriptions/api';
import { apiErrorText } from '@/features/finance/subscriptions/format';
import { t } from '@/lib/i18n/i18n';
import { categoriesQuery, saveExpense, uploadExpenseReceipt, type ExpenseView } from './api';
import { AddCategory } from './AddCategory';
import { expenseBody, expenseForm, type ExpenseForm } from './expense-form';
import { ExpenseFields } from './ExpenseFields';
import { useUploadMaxBytes } from '@/lib/settings/public-config';

type Props = { month: string; expense: ExpenseView | null; onClose: () => void; onSaved: () => void };

/** Add or edit an expense (R-RPT-02): category, amount, currency, paid day, vendor, method, receipt, note, repeat. */
export function ExpenseDialog({ month, expense, onClose, onSaved }: Props) {
  const queryClient = useQueryClient();
  const formId = useId();
  const categories = useQuery(categoriesQuery);
  const maxBytes = useUploadMaxBytes();
  const [form, setForm] = useState<ExpenseForm>(() => expenseForm(expense, expense ? '' : paidAtDay()));
  const [amountError, setAmountError] = useState<string | undefined>();
  const [file, setFile] = useState<File | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const uploaded = useRef<{ file: File; path: string } | null>(null);
  const save = useMutation({
    mutationFn: async (body: Parameters<typeof saveExpense>[0]['body']) => {
      let receiptPath: string | undefined;
      if (file) {
        receiptPath = uploaded.current?.file === file ? uploaded.current.path : await uploadExpenseReceipt(file);
        uploaded.current = { file, path: receiptPath };
      }
      return saveExpense({ id: expense?.id ?? null, body: { ...body, ...(receiptPath ? { receiptPath } : {}) } });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MONEY_KEY });
      onSaved();
    },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const bad = receiptProblem(file, maxBytes);
    setProblem(bad && t.payments.error[bad]);
    const r = expenseBody(form, expense?.month ?? month);
    setAmountError(r.ok ? undefined : r.errors.amount);
    if (r.ok && !bad) save.mutate(r.body);
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
      <form id={formId} className="grid gap-4" onSubmit={submit} noValidate>
        <ExpenseFields form={form} set={(patch) => setForm((f) => ({ ...f, ...patch }))} categories={categories.data ?? []} amountError={amountError} />
        <AddCategory onAdded={(key) => setForm((f) => ({ ...f, category: key }))} />
        <ReceiptField file={file} onChange={setFile} error={problem} />
        {save.isError && <FormAlert>{apiErrorText(save.error, { ...t.expenses.error, ...t.finance.error, ...t.payments.error })}</FormAlert>}
      </form>
    </Dialog>
  );
}
