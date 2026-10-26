import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Input } from '@/components/ui/form/input';
import { Select } from '@/components/ui/form/select';
import { usePermissions } from '@/features/people/auth/use-permissions';
import { paidAtDay } from '@/features/finance/payments/record/pay-day';
import { t } from '@/lib/i18n/i18n';
import { ASSISTANTS_KEY, assistantsQuery, broughtByQuery, setBroughtBy } from '../api';
import { broughtAtOf } from './brought-at';
import { errorText } from '../status';
import { formatDate } from '@/features/sales/leads/format';

const B = t.assistants.brought;

/** The student profile's «جُلب بواسطة» (R-ASST-01): who brought the student and when; an admin sets or changes it. */
export function BroughtByField({ studentId }: { studentId: string }) {
  const { can } = usePermissions();
  const current = useQuery({ ...broughtByQuery(studentId), enabled: can('assistantpay.read') });
  const assistants = useQuery({ ...assistantsQuery, enabled: can('assistantpay.write') });
  const queryClient = useQueryClient();
  const [pick, setPick] = useState<string | null>(null);
  const [day, setDay] = useState('');
  const [saved, setSaved] = useState(false);
  const save = useMutation({
    mutationFn: setBroughtBy,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ASSISTANTS_KEY });
      setPick(null);
      setSaved(true);
    },
  });
  if (!can('assistantpay.read') || !current.data) return null;

  const { assistant, brought_at } = current.data;
  const value = pick ?? assistant?.id ?? '';
  const changed = value !== (assistant?.id ?? '') || (day !== '' && assistant !== null);
  const submit = () => {
    setSaved(false);
    save.mutate({ studentIds: [studentId], assistantId: value || null, ...broughtAtOf(value ? day : '') });
  };
  return (
    <section aria-label={B.title} className="mt-6 grid gap-3 border-t border-rule pt-4">
      <h2 className="font-display text-h4 font-bold">{B.title}</h2>
      <p className="text-sm text-ink-2">
        {assistant ? assistant.name : B.none}
        {assistant && brought_at && <span className="text-ink-3"> · {B.since.replace('{date}', formatDate(brought_at))}</span>}
      </p>
      {can('assistantpay.write') && (
        <div className="flex flex-wrap items-end gap-3">
          <Field label={B.select}>
            {(p) => (
              <Select {...p} className="w-auto min-w-48" value={value} onChange={(e) => setPick(e.target.value)}>
                <option value="">{B.noneOption}</option>
                {(assistants.data ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {value !== '' && (
            <Field label={B.broughtAt}>
              {(p) => <Input {...p} type="date" dir="ltr" max={paidAtDay()} value={day} onChange={(e) => setDay(e.target.value)} />}
            </Field>
          )}
          <Button type="button" variant="secondary" disabled={!changed || save.isPending} onClick={submit}>
            {B.save}
          </Button>
          {saved && <span role="status" className="pb-2.5 text-sm text-ok">{B.saved}</span>}
        </div>
      )}
      <p className="text-xs text-ink-3">{B.hint}</p>
      {save.isError && <FormAlert>{errorText(save.error)}</FormAlert>}
    </section>
  );
}
