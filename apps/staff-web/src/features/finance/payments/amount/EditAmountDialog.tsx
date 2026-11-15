import type { UseMutationResult } from '@tanstack/react-query';
import { useState } from 'react';
import { AmountConfirm } from './AmountConfirm';
import { AmountForm } from './AmountForm';
import type { AmountTarget } from './amount-check';

interface Props {
  payment: AmountTarget;
  /** The write (admin PATCH /payments/:id, assistant PATCH /sales/payments/:id/amount). */
  save: UseMutationResult<unknown, Error, number>;
  onClose: () => void;
  onDone: () => void;
}

/**
 * «تعديل المبلغ» (owner 2026-11-02): one amount box (the current amount said above it), then a
 * confirm with old → new before the write; cancelling the confirm comes back to the box. The same
 * amount is refused in the box, never sent.
 */
export function EditAmountDialog({ payment, save, onClose, onDone }: Props) {
  const [typed, setTyped] = useState(payment.amount);
  const [confirming, setConfirming] = useState(false);
  const next = (amount: number) => {
    setTyped(amount);
    setConfirming(true);
  };
  const back = () => {
    save.reset();
    setConfirming(false);
  };
  if (!confirming) return <AmountForm {...{ payment, onClose }} initial={typed} onNext={next} />;
  return <AmountConfirm {...{ payment, save, onDone }} amount={typed} onClose={back} />;
}
