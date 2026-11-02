import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Select } from '@/components/ui/form/select';
import { t } from '@/lib/i18n/i18n';
import { assignAssistant, assistantsQuery, removeAssistant, studentAssistantsQuery } from '@/features/teaching/classroom/api/api';

/** Admin, student profile: the assistants allowed into this student's lessons. */
export function AssistantsManager({ studentId }: { studentId: string }) {
  const queryClient = useQueryClient();
  const mine = useQuery(studentAssistantsQuery(studentId));
  const all = useQuery(assistantsQuery);
  const [pick, setPick] = useState('');
  const refresh = () => queryClient.invalidateQueries({ queryKey: studentAssistantsQuery(studentId).queryKey });
  const add = useMutation({ mutationFn: assignAssistant, onSuccess: () => { setPick(''); return refresh(); } });
  const remove = useMutation({ mutationFn: removeAssistant, onSuccess: refresh });

  const assigned = new Set((mine.data ?? []).map((a) => a.profile_id));
  const free = (all.data ?? []).filter((a) => !assigned.has(a.profile_id));
  const failed = mine.isError || all.isError || add.isError || remove.isError;
  return (
    <section aria-label={t.classroom.assistants.title} className="mt-6 grid gap-3 border-t border-rule pt-4">
      <h2 className="font-display text-h4 font-bold">{t.classroom.assistants.title}</h2>
      {mine.data?.length === 0 && <p className="text-sm text-ink-2">{t.classroom.assistants.none}</p>}
      <ul className="grid gap-2">
        {(mine.data ?? []).map((a) => (
          <li key={a.profile_id} className="flex items-center justify-between gap-3 text-sm">
            <span>{a.full_name}</span>
            <Button type="button" variant="danger-quiet" size="sm" disabled={remove.isPending} onClick={() => remove.mutate({ studentId, profileId: a.profile_id })}>
              {t.classroom.assistants.remove}
            </Button>
          </li>
        ))}
      </ul>
      {all.isSuccess && free.length === 0 ? (
        <p className="text-xs text-ink-3">{t.classroom.assistants.noneAvailable}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Select aria-label={t.classroom.assistants.pick} value={pick} onChange={(e) => setPick(e.target.value)} className="max-w-64">
            <option value="">{t.classroom.assistants.pick}</option>
            {free.map((a) => (
              <option key={a.profile_id} value={a.profile_id}>{a.full_name}</option>
            ))}
          </Select>
          <Button type="button" variant="secondary" disabled={!pick || add.isPending} onClick={() => add.mutate({ studentId, profileId: pick })}>
            {t.classroom.assistants.add}
          </Button>
        </div>
      )}
      {failed && <FormAlert>{t.common.error}</FormAlert>}
    </section>
  );
}
