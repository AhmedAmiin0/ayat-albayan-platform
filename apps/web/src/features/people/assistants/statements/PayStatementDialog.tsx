import { PAYMENT_METHODS, type PaymentMethod } from '@ab/shared';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Input } from '@/components/ui/form/input';
import { Select } from '@/components/ui/form/select';
import { paidAtDay } from '@/features/finance/payments/record/pay-day';
import { ReceiptField, receiptProblem } from '@/features/finance/payments/attachments/ReceiptField';
import { monthLabel } from '@/features/finance/payouts/MonthSelect';
import { moneyText } from '@/features/finance/subscriptions/format';
import { t } from '@/lib/i18n/i18n';
import { useUploadMaxBytes } from '@/lib/settings/public-config';
import type { AssistantStatementView } from '../api';
import { errorText } from '../status';
import { usePayStatement } from './use-pay-statement';

type Props = { statement: AssistantStatementView; onClose: () => void };

/** «تأكيد الدفع» of a statement: date, method, note and receipt; one request freezes it as paid. */
export function PayStatementDialog({ statement, onClose }: Props) {
  const formId = useId();
  const maxBytes = useUploadMaxBytes();
  const [day, setDay] = useState(paidAtDay());
  const [method, setMethod] = useState<PaymentMethod>('bank');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const save = usePayStatement(statement.id, statement.assistant.id, onClose);
  const amounts = Object.entries(statement.totals).map(([c, v]) => moneyText(v.total, c)).join(t.common.listSeparator);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const bad = receiptProblem(file, maxBytes);
    setProblem(bad && t.payments.error[bad]);
    if (!bad) save.mutate({ day, method, note, file });
  };
  return (
    <Dialog
      title={t.assistants.statements.payTitle.replace('{assistant}', statement.assistant.name)}
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={formId} disabled={save.isPending}>
            {save.isPending ? t.earnings.saving : t.finance.confirmPaid}
          </Button>
        </>
      }
    >
      <form id={formId} className="grid gap-4" onSubmit={submit} noValidate>
        <p className="text-sm text-ink-2">{t.assistants.statements.payDue.replace('{month}', monthLabel(statement.month.slice(0, 7))).replace('{amounts}', amounts)}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.payments.method}>
            {(p) => (
              <Select {...p} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {t.enums.paymentMethod[m]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t.payments.paidAt}>
            {(p) => <Input {...p} type="date" dir="ltr" max={paidAtDay()} value={day} onChange={(e) => setDay(e.target.value)} />}
          </Field>
          <Field label={t.payments.note}>{(p) => <Input {...p} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
        </div>
        <ReceiptField file={file} onChange={setFile} error={problem} />
        {save.isError && <FormAlert>{errorText(save.error)}</FormAlert>}
      </form>
    </Dialog>
  );
}
