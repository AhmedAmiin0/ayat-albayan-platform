import { formatPhone, type PeopleEditView } from '@ab/shared';
import { useState } from 'react';
import { Ltr } from '@/components/ui/display/ltr';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';
import { removeSecondPhone } from '@/features/people/students/people-edit/api';
import { usePeopleWrite } from '@/features/people/students/people-edit/use-people-write';

const E = t.peopleEdit;

/** The family's second number with «حذف الرقم الثاني» behind a confirm; nothing without one. */
export function SecondPhone({
  guardian,
  onDone,
}: {
  guardian: PeopleEditView['guardian'];
  onDone: (notice: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const remove = usePeopleWrite(removeSecondPhone, () => onDone(E.saved));
  const second = guardian.phones.find((p) => !p.is_primary);
  if (!second) return null;
  const phone = formatPhone(second.phone_e164);
  return (
    <div className="grid gap-2 rounded-md border border-input p-3">
      <span className="text-sm text-ink-2">{E.fields.secondPhone}</span>
      <Ltr className="font-semibold tabular-nums">{phone}</Ltr>
      {confirming && <p className="text-sm">{E.removeSecondConfirm.replace('{phone}', phone)}</p>}
      <Button
        type="button"
        variant={confirming ? 'danger' : 'secondary'}
        disabled={remove.isPending}
        onClick={() =>
          confirming
            ? remove.mutate({ guardianId: guardian.id, phone: second.phone_e164 })
            : setConfirming(true)
        }
      >
        {confirming ? E.confirm : E.removeSecond}
      </Button>
      {remove.errorText && <FormAlert>{remove.errorText}</FormAlert>}
    </div>
  );
}
