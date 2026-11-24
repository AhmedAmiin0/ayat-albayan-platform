import { useState } from 'react';
import { t, Button } from '@ab/mobile-kit';
import { AmountEditSheet } from './AmountEditSheet';
import type { AmountEditMutation } from './use-amount-edit';

interface EditAmountButtonProps {
  payment: { amount: number; currency: string; student: { name: string } };
  /** The admin's PATCH or hers: the sheet is the same. */
  edit: AmountEditMutation;
}

/** The sheet mounts only while open, so the field starts fresh each time. */
export function EditAmountButton({ payment, edit }: EditAmountButtonProps) {
  const [open, setOpen] = useState(false);
  const show = () => {
    edit.reset();
    setOpen(true);
  };
  return (
    <>
      <Button
        variant="secondary"
        label={t.payments.editAmount.action}
        accessibilityLabel={`${t.payments.editAmount.action} · ${payment.student.name}`}
        onPress={show}
      />
      {open ? (
        <AmountEditSheet payment={payment} edit={edit} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
