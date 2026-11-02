import { usedBeforeEditMax } from '@ab/shared';
import { useId, useState, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Dialog } from '@/components/ui/overlay/dialog';
import { Stepper } from '@/features/finance/pricing';
import { apiErrorText } from '@/features/finance/subscriptions/format';
import { t } from '@/lib/i18n/i18n';
import { useEditUsedBefore } from './use-edit-used-before';

/** The package's lessons as the card shows them (lessons_used counts lessons_used_before). */
export interface UsedBeforePackage {
  id: string;
  lessons_total: number;
  lessons_used: number;
  lessons_used_before?: number | undefined;
}

interface Props {
  pkg: UsedBeforePackage;
  staleKey?: readonly unknown[] | undefined;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * «تعديل عدد الحلقات المستخدمة» (owner 2026-11-02): − / + only, from 0 to usedBeforeEditMax (one
 * lesson left per course day, never what the platform already counted); the API refuses a package
 * with a booked course (409, shown here).
 */
export function EditUsedBeforeDialog({ pkg, staleKey, onClose, onSaved }: Props) {
  const formId = useId();
  const e = t.salesMoney.usedBeforeEdit;
  const from = pkg.lessons_used_before ?? 0;
  const [value, setValue] = useState(from);
  const platformUsed = pkg.lessons_used - from;
  const max = usedBeforeEditMax({ lessonsTotal: pkg.lessons_total, platformUsed });
  const run = useEditUsedBefore({ subscriptionId: pkg.id, staleKey, onSaved });
  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    run.mutate(value);
  };
  return (
    <Dialog
      title={e.title}
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {e.cancel}
          </Button>
          <Button type="submit" form={formId} disabled={run.isPending || value === from}>
            {e.save}
          </Button>
        </>
      }
    >
      <form id={formId} className="grid gap-4" onSubmit={submit} noValidate>
        <p className="text-sm text-ink-2">{e.current.replace('{n}', String(from))}</p>
        <Stepper
          label={t.salesMoney.usedBefore}
          hint={e.hint}
          value={Math.min(value, max)}
          min={0}
          max={max}
          onChange={setValue}
          stepLabels={{ less: t.salesMoney.usedBeforeLess, more: t.salesMoney.usedBeforeMore }}
          typed={false}
        />
        {run.isError && <FormAlert>{apiErrorText(run.error, e.errors)}</FormAlert>}
      </form>
    </Dialog>
  );
}
