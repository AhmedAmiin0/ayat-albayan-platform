import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { apiSend } from '@/lib/api';
import { t } from '@/lib/i18n';
import { timeOffQuery } from './api';
import { TimeOffDialog } from './TimeOffDialog';
import { formatTimeOff } from './time-off';

/**
 * «الإجازات» panel (docs/07 §8): date span, reason, delete; add opens a dialog. R-TCH-02.
 * TODO(R-SCH-07): the impact note «{n} حلقات واقعة في الإجازة دي…» + «انقل الحلقات» once lessons exist.
 */
export function TimeOffList({ teacherId }: { teacherId: string }) {
  const queryClient = useQueryClient();
  const list = useQuery(timeOffQuery(teacherId));
  const [adding, setAdding] = useState(false);
  const remove = useMutation({
    mutationFn: (id: string) => apiSend('DELETE', `/teachers/${teacherId}/time-off/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: timeOffQuery(teacherId).queryKey }),
  });

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="font-display text-h4 font-bold">{t.availability.timeOff}</h2>
        <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
          <Icon name="plus" />
          {t.availability.timeOffAdd}
        </Button>
      </div>
      {list.isError && (
        <p role="alert" className="py-3 text-xs text-danger">
          {t.common.error}
        </p>
      )}
      {list.data?.length === 0 && <p className="border-b border-rule py-3 text-sm text-ink-3">{t.availability.timeOffEmpty}</p>}
      <ul>
        {list.data?.map((off) => {
          const span = formatTimeOff(off.starts_at, off.ends_at);
          return (
            <li key={off.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 border-b border-rule py-3">
              <span className="font-semibold tabular-nums">{span}</span>
              <IconButton
                label={`${t.availability.timeOffDelete} ${span}`}
                className="row-span-2"
                disabled={remove.isPending}
                onClick={() => remove.mutate(off.id)}
              >
                <Icon name="trash" />
              </IconButton>
              {off.reason && <span className="text-xs text-ink-2">{`${t.availability.reason}: ${off.reason}`}</span>}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-ink-3">{t.availability.timeOffTzHint}</p>
      {adding && <TimeOffDialog teacherId={teacherId} onClose={() => setAdding(false)} />}
    </section>
  );
}
