import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { LESSONS_KEY, syncSchedule } from './api';

/**
 * «مزامنة الجدول»: the weekly rules generate their missing lessons now (the daily pass), then the
 * calendar reloads. The answer is the page's toast via onDone.
 */
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
