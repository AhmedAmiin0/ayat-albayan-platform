import type { NumberEvolutionView, NumberView } from '@ab/shared';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { evolutionErrorText } from './evolution-sync-api';
import { EvolutionSyncLine } from './EvolutionSyncLine';
import { useEvolutionSync } from './use-evolution-sync';

const s = t.numbers.evolution.sync;

export interface EvolutionSyncPanelProps {
  view: NumberView;
  evolution: NumberEvolutionView;
  /** Both buttons call Evolution, so only numbers.manage sees them. */
  manage: boolean;
}

export function EvolutionSyncPanel({ view, evolution, manage }: EvolutionSyncPanelProps) {
  const sync = useEvolutionSync(view.id);
  return (
    <div className="grid gap-2">
      <EvolutionSyncLine sync={sync.last ?? evolution.sync} />
      {manage && (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" disabled={sync.pending} onClick={sync.push}>
            {s.push}
          </Button>
          <Button size="sm" variant="ghost" disabled={sync.pending} onClick={sync.verify}>
            {s.verify}
          </Button>
        </div>
      )}
      {sync.error && (
        <p role="alert" className="text-xs font-semibold text-danger">{evolutionErrorText(sync.error)}</p>
      )}
    </div>
  );
}
