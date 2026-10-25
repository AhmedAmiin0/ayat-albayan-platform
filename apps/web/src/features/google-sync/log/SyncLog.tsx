import { GOOGLE_SYNC_STATES, type GoogleStatusView } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';
import { BlockSkeleton, GoogleBlock, LoadError } from '../GoogleBlock';
import { googleItemsQuery, googleStatusQuery, reconcileGoogle } from '../google-api';
import { fill } from '../google-format';
import { SyncLogRow } from './SyncLogRow';

const s = t.googleSync.log;

/** The items summary: one count per state, from the status. */
function Counts({ counts }: { counts: GoogleStatusView['counts'] }) {
  return (
    <div className="grid gap-1">
      <p className="text-xs font-semibold text-ink-2">{t.googleSync.counts.title}</p>
      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {GOOGLE_SYNC_STATES.map((state) => (
          <div key={state} className="flex items-baseline gap-1.5">
            <dt className="text-ink-2">{s.state[state]}</dt>
            <dd className="font-semibold tabular-nums">{counts[state]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** «سجل المزامنة»: the last 100 items, «زامن الآن», the known gap and the counts. */
export function SyncLog({ status, onNote }: { status: GoogleStatusView; onNote: (message: string) => void }) {
  const queryClient = useQueryClient();
  const list = useQuery(googleItemsQuery);
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: googleItemsQuery.queryKey }),
      queryClient.invalidateQueries({ queryKey: googleStatusQuery.queryKey }),
    ]);
  const reconcile = useMutation({
    mutationFn: reconcileGoogle,
    onSuccess: async ({ queued }) => {
      onNote(fill(s.reconciled, { n: queued }));
      await refresh();
    },
  });
  const now = (
    <Button size="sm" variant="secondary" disabled={reconcile.isPending} onClick={() => reconcile.mutate()}>
      {s.reconcile}
    </Button>
  );
  return (
    <GoogleBlock title={s.title} hint={s.hint} actions={now}>
      <p role="note" className="border-s-2 border-s-rule ps-3 text-xs text-ink-2">
        {t.googleSync.gap}
      </p>
      <Counts counts={status.counts} />
      {reconcile.isError && <FormAlert>{t.googleSync.common.saveError}</FormAlert>}
      {list.isPending && <BlockSkeleton rows={4} />}
      {list.isError && <LoadError message={t.googleSync.loadError} onRetry={() => void list.refetch()} />}
      {list.data?.length === 0 && <p className="text-sm text-ink-3">{s.empty}</p>}
      {list.data && list.data.length > 0 && (
        <ul aria-label={s.title} className="grid divide-y divide-rule border-y border-rule">
          {list.data.map((item) => (
            <SyncLogRow key={item.id} item={item} onRetried={() => onNote(s.retried)} onChanged={refresh} />
          ))}
        </ul>
      )}
    </GoogleBlock>
  );
}
