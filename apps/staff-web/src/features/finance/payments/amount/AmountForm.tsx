import { useId, useState, type SubmitEvent } from 'react';
import { Button, Dialog, Field, Input, t } from '@ab/web-kit';
import { currencySymbol, moneyText, studentLabel } from '@/features/finance/subscriptions';
import { checkAmount, type AmountTarget } from './amount-check';

const T = t.payments.editAmount;

interface Props {
  payment: AmountTarget;
  /** What was typed before (back from the confirm), else the current amount. */
  initial: number;
  onNext: (amount: number) => void;
  onClose: () => void;
}

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
