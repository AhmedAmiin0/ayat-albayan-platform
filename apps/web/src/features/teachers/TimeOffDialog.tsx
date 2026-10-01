import type { TimeOffCreate } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { apiSend } from '@/lib/api';
import { t } from '@/lib/i18n';
import { timeOffQuery } from './api';
import { FormAlert } from '@/components/ui/form-alert';
import { emptyTimeOffDraft, toTimeOffBody, type TimeOffDraft } from './time-off';

type Props = { teacherId: string; onClose: () => void };

/** Add one-off unavailability (R-TCH-02). Instants are sent as UTC (rule 6). */
export function TimeOffDialog({ teacherId, onClose }: Props) {
  const queryClient = useQueryClient();
  const formId = useId();
  const [draft, setDraft] = useState(emptyTimeOffDraft);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<TimeOffDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const add = useMutation({
    mutationFn: (body: TimeOffCreate) => apiSend('POST', `/teachers/${teacherId}/time-off`, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: timeOffQuery(teacherId).queryKey });
      onClose();
    },
    onError: () => setError(t.common.error),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = toTimeOffBody(draft);
    setError(result.ok ? null : result.error);
    if (result.ok) add.mutate(result.body);
  };

  return (
    <Dialog
      title={t.availability.timeOffAdd}
      onClose={onClose}
      hint={t.availability.timeOffTzHint}
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={formId} disabled={add.isPending}>
            {add.isPending ? t.common.saving : t.availability.timeOffAdd}
          </Button>
        </>
      }
    >
      <form id={formId} className="grid gap-4 sm:grid-cols-2" onSubmit={submit} noValidate>
        <Field label={t.availability.startsAt}>
          {(p) => (
            <Input
              {...p}
              data-autofocus
              type="datetime-local"
              value={draft.starts_at}
              onChange={(e) => set({ starts_at: e.target.value })}
            />
          )}
        </Field>
        <Field label={t.availability.endsAt}>
          {(p) => (
            <Input {...p} type="datetime-local" value={draft.ends_at} onChange={(e) => set({ ends_at: e.target.value })} />
          )}
        </Field>
        <div className="sm:col-span-2">
          <Field label={t.availability.reason}>
            {(p) => <Input {...p} value={draft.reason} onChange={(e) => set({ reason: e.target.value })} />}
          </Field>
        </div>
        {error && <FormAlert className="sm:col-span-2">{error}</FormAlert>}
      </form>
    </Dialog>
  );
}
