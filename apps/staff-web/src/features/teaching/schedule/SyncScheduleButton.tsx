import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { LESSONS_KEY, syncSchedule } from './api';

/** Runs the daily generation pass now, then reloads; the answer is the page's toast. */
export function SyncScheduleButton({ onDone }: { onDone: (message: string) => void }) {
  const queryClient = useQueryClient();
  const sync = useMutation({
    mutationFn: syncSchedule,
    onSuccess: async ({ inserted }) => {
      await queryClient.invalidateQueries({ queryKey: LESSONS_KEY });
      onDone(inserted > 0 ? t.schedule.synced.replace('{n}', String(inserted)) : t.schedule.syncedNone);
    },
    onError: () => onDone(t.common.error),
  });
  return (
    <Button variant="secondary" disabled={sync.isPending} onClick={() => sync.mutate()}>
      {sync.isPending ? t.schedule.syncing : t.schedule.sync}
    </Button>
  );
}
