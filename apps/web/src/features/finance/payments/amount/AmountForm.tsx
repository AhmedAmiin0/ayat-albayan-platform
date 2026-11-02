import { useId, useState, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { currencySymbol, moneyText, studentLabel } from '@/features/finance/subscriptions';
import { t } from '@/lib/i18n/i18n';
import { checkAmount, type AmountTarget } from './amount-check';

const T = t.payments.editAmount;

interface Props {
  payment: AmountTarget;
  /** What was typed before (back from the confirm), else the current amount. */
  initial: number;
  onNext: (amount: number) => void;
  onClose: () => void;
}

/** «تعديل مبلغ الدفعة»: one box for the new amount, the current one under it (checkAmount). */
export function AmountForm({ payment, initial, onNext, onClose }: Props) {
  const formId = useId();
  const [text, setText] = useState(String(initial));
  const [error, setError] = useState<string | null>(null);
  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    const checked = checkAmount(text, payment.amount);
    setError(checked.ok ? null : checked.error);
    if (checked.ok) onNext(checked.amount);
  };
  const actions = (
    <>
      <Button type="button" variant="ghost" onClick={onClose}>
        {t.common.cancel}
      </Button>
      <Button type="submit" form={formId}>
        {T.action}
      </Button>
    </>
  );
  return (
    <Dialog
      title={T.title}
      description={studentLabel(payment.student)}
      onClose={onClose}
      actions={actions}
    >
      <form id={formId} className="grid gap-4" onSubmit={submit} noValidate>
        <Field
          label={T.newAmount.replace('{currency}', currencySymbol(payment.currency))}
          hint={T.current.replace('{amount}', moneyText(payment.amount, payment.currency))}
          error={error ?? undefined}
        >
          {(p) => (
            <Input
              {...p}
              type="text"
              inputMode="decimal"
              dir="ltr"
              className="max-w-[220px] tabular-nums"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          )}
        </Field>
      </form>
    </Dialog>
  );
}
