import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Input } from '@/components/ui/form/input';
import { Select } from '@/components/ui/form/select';
import { paidAtDay } from '@/features/payments/pay-day';
import { t } from '@/lib/i18n/i18n';
import { ASSISTANTS_KEY, assistantsQuery, setBroughtBy } from './api';
import { broughtAtOf } from './brought-at';
import { errorText } from './status';
import type { StudentPick } from './use-student-pick';

const B = t.assistants.brought;
type Props = { pick: StudentPick; onDone: (message: string) => void };

/** «تعيين مسؤول مبيعات (n)» in the students head: one salesperson for every ticked student (R-ASST-01, audited by the API). */
export function BulkAssign({ pick, onDone }: Props) {
  const [open, setOpen] = useState(false);
  if (!pick.enabled || pick.ids.length === 0) return null;
  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        {B.bulk.replace('{count}', String(pick.ids.length))}
      </Button>
      {open && (
        <BulkDialog
          ids={pick.ids}
          onClose={() => setOpen(false)}
          onDone={(message) => {
            setOpen(false);
            pick.clear();
            onDone(message);
          }}
        />
      )}
    </>
  );
}

function BulkDialog({ ids, onClose, onDone }: { ids: readonly string[]; onClose: () => void; onDone: (message: string) => void }) {
  const formId = useId();
  const queryClient = useQueryClient();
  const assistants = useQuery(assistantsQuery);
  const [assistantId, setAssistantId] = useState('');
  const [day, setDay] = useState('');
  const save = useMutation({
    mutationFn: setBroughtBy,
    onSuccess: async (r) => {
      await queryClient.invalidateQueries({ queryKey: ASSISTANTS_KEY });
      onDone(B.bulkDone.replace('{count}', String(r.changed)));
    },
  });
  return (
    <Dialog
      title={B.bulkTitle.replace('{count}', String(ids.length))}
      onClose={onClose}
      compact
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={formId} disabled={save.isPending}>
            {B.bulkApply}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate({ studentIds: [...ids], assistantId: assistantId || null, ...broughtAtOf(assistantId ? day : '') });
        }}
      >
        <Field label={B.select}>
          {(p) => (
            <Select {...p} value={assistantId} onChange={(e) => setAssistantId(e.target.value)}>
              <option value="">{B.noneOption}</option>
              {(assistants.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {assistantId !== '' && (
          <Field label={B.broughtAt}>
            {(p) => <Input {...p} type="date" dir="ltr" max={paidAtDay()} value={day} onChange={(e) => setDay(e.target.value)} />}
          </Field>
        )}
        {save.isError && <FormAlert>{errorText(save.error)}</FormAlert>}
      </form>
    </Dialog>
  );
}
