import type { EvolutionSyncView } from '@ab/shared';
import { StatusChip } from '@/components/ui/display/status-chip';
import { formatDateTime } from '@/features/sales/leads';
import { useClock } from '@/lib/clock';
import { t } from '@/lib/i18n/i18n';
import { SYNC_STATE_STYLE, SYNC_WORD_STYLE, syncPartsOf, syncWordOf } from './sync-words';

const s = t.numbers.evolution.sync;

/** The parts of the last push in words: «المثيل: متطابق · الوكيل: متخطّى …». */
function SyncParts({ sync }: { sync: EvolutionSyncView }) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1">
      {syncPartsOf(sync).map(({ part, state }) => (
        <li key={part} className="flex items-center gap-1">
          <span className="text-ink-3">{s.parts[part]}:</span>
          <StatusChip size="sm" {...SYNC_STATE_STYLE[state]} label={s.states[state]} />
        </li>
      ))}
    </ul>
  );
}

/** «المزامنة مع Evolution»: «متزامن» / «غير متزامن» / «لم تُزامن بعد», when, and each part. */
export function EvolutionSyncLine({ sync }: { sync: EvolutionSyncView | null }) {
  const clock = useClock();
  const word = syncWordOf(sync);
  return (
    <div className="grid gap-1 text-xs">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-ink-3">{s.label}:</span>
        <StatusChip size="sm" {...SYNC_WORD_STYLE[word]} label={s[word]} />
        {sync && (
          <span className="text-ink-3">{s.at.replace('{{at}}', formatDateTime(sync.checked_at, clock))}</span>
        )}
      </p>
      {sync && <SyncParts sync={sync} />}
    </div>
  );
}
