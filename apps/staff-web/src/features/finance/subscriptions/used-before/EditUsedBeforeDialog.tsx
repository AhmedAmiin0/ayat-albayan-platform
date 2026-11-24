import type { UsedBeforeState } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useId, useState, type SubmitEvent } from 'react';
import { ListSkeleton } from '@ab/web-kit/components/ui/display/skeleton';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { Dialog } from '@ab/web-kit/components/ui/overlay/dialog';
import { Stepper } from '@/features/finance/pricing';
import { usedBeforeStateQuery } from '@/features/finance/subscriptions/api';
import { apiErrorText } from '@/features/finance/subscriptions/format';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useEditUsedBefore } from './use-edit-used-before';

interface Props {
  subscriptionId: string;
  onClose: () => void;
  onSaved: () => void;
}

const e = t.salesMoney.usedBeforeEdit;

/** Starts from min(stored, max); save only for another number. */
function EditForm({ state, formId, run }: { state: UsedBeforeState; formId: string; run: Run }) {
  const from = state.lessons_used_before;
  const [value, setValue] = useState(Math.min(from, state.max));
  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    run.mutate(value);
  };
  return (
    <form id={formId} className="grid gap-4" onSubmit={submit} noValidate>
      <p className="text-sm text-ink-2">{e.current.replace('{n}', String(from))}</p>
      <Stepper
        label={t.salesMoney.usedBefore}
        hint={e.hint}
        value={value}
        min={0}
        max={state.max}
        onChange={setValue}
        stepLabels={{ less: t.salesMoney.usedBeforeLess, more: t.salesMoney.usedBeforeMore }}
        typed={false}
      />
      <Button type="submit" disabled={run.isPending || value === from}>
        {e.save}
      </Button>
      {run.isError && <FormAlert>{apiErrorText(run.error, e.errors)}</FormAlert>}
    </form>
  );
}

type Run = ReturnType<typeof useEditUsedBefore>;

/** Reads the server first; the max keeps one lesson per course day (usedBeforeEditMax). */
export function EditUsedBeforeDialog({ subscriptionId, onClose, onSaved }: Props) {
  const formId = useId();
  const state = useQuery(usedBeforeStateQuery(subscriptionId));
  const run = useEditUsedBefore({ subscriptionId, onSaved });
  const blocked = state.data?.blocked ?? null;
  return (
    <Dialog
      title={e.title}
      onClose={onClose}
      actions={
        <Button type="button" variant="ghost" onClick={onClose}>
          {e.cancel}
        </Button>
      }
    >
      {state.isPending && <ListSkeleton />}
      {state.isError && <FormAlert>{t.common.error}</FormAlert>}
      {blocked && <FormAlert>{e.errors[blocked]}</FormAlert>}
      {state.data && !blocked && <EditForm state={state.data} formId={formId} run={run} />}
    </Dialog>
  );
}
