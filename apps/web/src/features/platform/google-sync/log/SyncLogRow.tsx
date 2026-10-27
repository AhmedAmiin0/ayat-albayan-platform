import type { GoogleSyncItemView } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Ltr } from '@/components/ui/display/ltr';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n/i18n';
import { retryGoogleItem } from '../google-api';
import { errorText, fill, formatAt, RETRYABLE, skipLabel, stateStyle } from '../google-format';
import { useClock } from '@/lib/clock';

const s = t.googleSync.log;
/** «مخطط: » before the LTR «POST calendar/…» island (the template ends with «{method} {target}»). */
const PLANNED_LEAD = s.planned.split('{method}')[0] ?? '';

interface Props {
  item: GoogleSyncItemView;
  onRetried: () => void;
  onChanged: () => Promise<unknown>;
}

/** What to say about an item: why it was skipped, its last error, the dry run's planned request. */
function Detail({ item }: { item: GoogleSyncItemView }) {
  return (
    <div className="grid min-w-0 gap-0.5 text-xs text-ink-2">
      {item.skip_reason && <p>{skipLabel(item.skip_reason)}</p>}
      {item.last_error && <p className="break-words text-danger">{fill(t.googleSync.connection.lastError, { error: errorText(item.last_error) })}</p>}
      {item.planned && (
        <p className="min-w-0 break-all">
          {PLANNED_LEAD}
          <Ltr className="whitespace-normal">{`${item.planned.method} ${item.planned.target}`}</Ltr>
          {item.planned.summary && <span className="block text-ink-3">{item.planned.summary}</span>}
        </p>
      )}
    </div>
  );
}

/** One sync item as a card that reads on a 390px phone; «إعادة المحاولة» on failed / gone / skipped. */
export function SyncLogRow({ item, onRetried, onChanged }: Props) {
  const clock = useClock();
  const retry = useMutation({
    mutationFn: retryGoogleItem,
    onSuccess: async () => {
      onRetried();
      await onChanged();
    },
  });
  return (
    <li className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-4">
      <div className="grid min-w-0 gap-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <StatusChip size="sm" {...stateStyle[item.state]} label={s.state[item.state]} />
          <span className="text-xs font-semibold text-ink-2">{s.kind[item.kind]}</span>
        </div>
        <p className="min-w-0 text-sm break-words">{item.subject}</p>
        <Detail item={item} />
        <p className="text-2xs text-ink-3">
          <span>{fill(s.attempts, { n: item.attempts })}</span>
          <span aria-hidden="true"> · </span>
          <span>{fill(t.googleSync.web.updated, { at: formatAt(item.updated_at, clock) })}</span>
        </p>
      </div>
      {RETRYABLE.has(item.state) && (
        <Button size="sm" variant="secondary" className="justify-self-start" disabled={retry.isPending} onClick={() => retry.mutate(item.id)}>
          {s.retry}
        </Button>
      )}
      {retry.isError && <FormAlert className="sm:col-span-2">{t.googleSync.common.saveError}</FormAlert>}
    </li>
  );
}
