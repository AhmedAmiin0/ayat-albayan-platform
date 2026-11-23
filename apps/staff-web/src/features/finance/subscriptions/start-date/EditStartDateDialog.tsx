import { startDateEditMax, startDateEditMin } from '@ab/shared';
import { riyadhToday } from '@ab/time';
import { useId, useState, type SubmitEvent } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Field } from '@ab/web-kit/components/ui/form/field';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { Input } from '@ab/web-kit/components/ui/form/input';
import { Dialog } from '@ab/web-kit/components/ui/overlay/dialog';
import { apiErrorText } from '@/features/finance/subscriptions/format';
import { dateLabel } from '@/features/teaching/schedule';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useEditStartDate } from './use-edit-start-date';

export interface StartDatePackage {
  id: string;
  /** YYYY-MM-DD. */
  starts_on: string;
  lessons_used_before?: number | undefined;
}

interface Props {
  pkg: StartDatePackage;
  onClose: () => void;
  onSaved: () => void;
}

const e = t.salesMoney.startDateEdit;

/**
 * «تعديل تاريخ البدء» (owner 2026-11-03): a native date input bounded as the server checks
 * (startDateEditMin / startDateEditMax: a year back; before today with lessons counted before),
 * «حفظ» only for another day.
 */
export function EditStartDateDialog({ pkg, onClose, onSaved }: Props) {
  const formId = useId();
  const [value, setValue] = useState(pkg.starts_on);
  const run = useEditStartDate({ subscriptionId: pkg.id, onSaved });
  const today = riyadhToday();
  const max = startDateEditMax({ today, lessonsUsedBefore: pkg.lessons_used_before ?? 0 });
  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    run.mutate(value);
  };
  const unchanged = value === '' || value === pkg.starts_on;
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
      <form id={formId} className="grid gap-4" onSubmit={submit} noValidate>
        <p className="text-sm text-ink-2">{e.current.replace('{date}', dateLabel(pkg.starts_on))}</p>
        <Field label={e.label} hint={e.hint}>
          {(p) => (
            <Input
              {...p}
              type="date"
              dir="ltr"
              className="max-w-[220px]"
              min={startDateEditMin(today)}
              max={max}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              required
            />
          )}
        </Field>
        <Button type="submit" disabled={run.isPending || unchanged}>
          {e.save}
        </Button>
        {run.isError && <FormAlert>{apiErrorText(run.error, e.errors)}</FormAlert>}
      </form>
    </Dialog>
  );
}
