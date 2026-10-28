import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/form/button';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Input } from '@/components/ui/form/input';
import { Dialog } from '@/components/ui/overlay/dialog';
import { t } from '@/lib/i18n/i18n';
import { MONEY_KEY } from '../api';
import { apiErrorText } from '../format';

export type CancelBody = { reason?: string };

type Props = {
  /** «باقة ٨ حلقات · سهيلة»: which package is cancelled. */
  label: string;
  /** POST /subscriptions/:id/cancel (admin) or POST /sales/subscriptions/:id/cancel (her own student's). */
  cancel: (body: CancelBody) => Promise<unknown>;
  /** What a cancel makes stale (default MONEY_KEY: the admin's money; the sales chat passes its own). */
  staleKey?: readonly unknown[];
  onClose: () => void;
  onDone: () => void;
};

/**
 * «إلغاء الباقة» (owner 2026-10-28): a package made by mistake is cancelled, never deleted. Asks once, with an
 * optional reason; the API refuses a package with money or lessons (409, shown here).
 */
export function CancelPackageDialog({ label, cancel, staleKey = MONEY_KEY, onClose, onDone }: Props) {
  const formId = useId();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const run = useMutation({
    mutationFn: cancel,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: staleKey });
      onDone();
    },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = reason.trim();
    run.mutate(text ? { reason: text } : {});
  };
  return (
    <Dialog
      title={t.subscriptions.cancel.title}
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.back}
          </Button>
          <Button type="submit" form={formId} variant="danger" disabled={run.isPending}>
            {t.subscriptions.cancel.confirm}
          </Button>
        </>
      }
    >
      <form id={formId} className="grid gap-4" onSubmit={submit} noValidate>
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="text-sm text-ink-2">{t.subscriptions.cancel.body}</p>
        <Field label={t.subscriptions.cancel.reason}>
          {(p) => <Input {...p} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />}
        </Field>
        {run.isError && <FormAlert>{apiErrorText(run.error, t.subscriptions.cancel.errors)}</FormAlert>}
      </form>
    </Dialog>
  );
}
