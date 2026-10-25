import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Input } from '@/components/ui/form/input';
import { t } from '@/lib/i18n/i18n';

type Props = {
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  /** Ask «السبب» (required, ≥ 3 letters): voiding money is explained in the audit log. */
  withReason?: boolean;
  pending: boolean;
  error: string | null;
  onConfirm: (reason: string) => void;
  onClose: () => void;
};

/** A money correction asks once more before it happens (delete a payment, void, un-pay, reopen). */
export function ConfirmDialog({ title, children, confirmLabel, withReason, pending, error, onConfirm, onClose }: Props) {
  const formId = useId();
  const [reason, setReason] = useState('');
  const [missing, setMissing] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const short = withReason === true && reason.trim().length < 3;
    setMissing(short);
    if (!short) onConfirm(reason.trim());
  };
  return (
    <Dialog
      title={title}
      onClose={onClose}
      compact={!withReason}
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={formId} variant="danger" disabled={pending}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <form id={formId} className="grid gap-4" onSubmit={submit} noValidate>
        {children}
        {withReason && (
          <Field label={t.finance.reason} error={missing ? t.finance.reasonRequired : undefined}>
            {(p) => <Input {...p} value={reason} onChange={(e) => setReason(e.target.value)} required />}
          </Field>
        )}
        {error && <FormAlert>{error}</FormAlert>}
      </form>
    </Dialog>
  );
}
