import type { TimeOffCreate } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiSend } from '@/lib/api';
import { t } from '@/lib/i18n';
import { timeOffQuery } from './api';
import { FormField } from './FormField';
import { emptyTimeOffDraft, formatInstant, toTimeOffBody } from './time-off';

/** One-off unavailability for a teacher: list, add, delete. R-TCH-02. */
export function TimeOffList({ teacherId }: { teacherId: string }) {
  const queryClient = useQueryClient();
  const list = useQuery(timeOffQuery(teacherId));
  const [draft, setDraft] = useState(emptyTimeOffDraft);
  const [error, setError] = useState<string | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: timeOffQuery(teacherId).queryKey });
  const path = `/teachers/${teacherId}/time-off`;

  const add = useMutation({
    mutationFn: (body: TimeOffCreate) => apiSend('POST', path, body),
    onSuccess: async () => {
      setDraft(emptyTimeOffDraft);
      await refresh();
    },
    onError: () => setError(t.common.error),
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiSend('DELETE', `${path}/${id}`),
    onSuccess: refresh,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = toTimeOffBody(draft);
    setError(result.ok ? null : result.error);
    if (result.ok) add.mutate(result.body);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t.availability.timeOffTzHint}</p>
      {list.data && list.data.length === 0 && <p>{t.availability.timeOffEmpty}</p>}
      <ul className="flex flex-col gap-2">
        {list.data?.map((off) => (
          <li key={off.id} className="flex items-center gap-3 rounded-md border border-border p-2">
            <span>
              {t.availability.startsAt} {formatInstant(off.starts_at)} {t.availability.endsAt}{' '}
              {formatInstant(off.ends_at)}
            </span>
            {off.reason && <span className="text-muted-foreground">{off.reason}</span>}
            <Button
              variant="ghost"
              size="sm"
              className="ms-auto"
              disabled={remove.isPending}
              onClick={() => remove.mutate(off.id)}
            >
              {t.common.delete}
            </Button>
          </li>
        ))}
      </ul>
      <form className="grid gap-3 sm:grid-cols-4 sm:items-end" onSubmit={submit} noValidate>
        <FormField id="off-start" label={t.availability.startsAt}>
          <Input
            id="off-start"
            type="datetime-local"
            value={draft.starts_at}
            onChange={(e) => setDraft({ ...draft, starts_at: e.target.value })}
          />
        </FormField>
        <FormField id="off-end" label={t.availability.endsAt}>
          <Input
            id="off-end"
            type="datetime-local"
            value={draft.ends_at}
            onChange={(e) => setDraft({ ...draft, ends_at: e.target.value })}
          />
        </FormField>
        <FormField id="off-reason" label={t.availability.reason}>
          <Input
            id="off-reason"
            value={draft.reason}
            onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
          />
        </FormField>
        <Button type="submit" disabled={add.isPending}>
          {t.availability.timeOffAdd}
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
