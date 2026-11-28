import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type SubmitEvent } from 'react';
import { Button, Field, FormAlert, Input, Dialog, t } from '@ab/web-kit';
import { MONEY_KEY } from '@/features/finance/subscriptions/api';
import { apiErrorText } from '@/features/finance/subscriptions/format';

export interface CancelBody { reason?: string }

interface Props {
  label: string;
  /** POST /subscriptions/:id/cancel (admin) or /sales/subscriptions/:id/cancel (own student). */
  cancel: (body: CancelBody) => Promise<unknown>;
  /** What a cancel makes stale (default MONEY_KEY; the sales chat passes its own). */
  staleKey?: readonly unknown[];
  onClose: () => void;
  onDone: () => void;
}

/** Cancelled, never deleted; the API refuses a package with money or lessons (409). */
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
  const submit = (e: SubmitEvent) => {
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
