import type { EvolutionState } from '@ab/shared';
import type { Glyph, Tone } from '@ab/money';
import { StatusChip } from '@ab/web-kit/components/ui/display/status-chip';
import { formatDateTime } from '@/features/sales/leads';
import { useClock } from '@ab/web-kit/lib/clock';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { shownState, type ShownState } from './evolution-api';

const e = t.numbers.evolution;

const STYLE: Record<ShownState, { tone: Tone; glyph: Glyph }> = {
  open: { tone: 'ok', glyph: 'fill' },
  connecting: { tone: 'neutral', glyph: 'half' },
  close: { tone: 'act', glyph: 'struck' },
  refused: { tone: 'bad', glyph: 'struck' },
  unknown: { tone: 'neutral', glyph: 'hollow' },
};

export interface EvolutionStateLineProps {
  state: EvolutionState | null;
  /** When Evolution said it (webhook or «افحص الاتصال»); null = never. */
  at: string | null;
}

/** «حالة الاتصال»: one chip in words, and when it was last known. */
export function EvolutionStateLine({ state, at }: EvolutionStateLineProps) {
  const clock = useClock();
  const shown = shownState(state);
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      <span className="text-ink-3">{e.stateLabel}:</span>
      <StatusChip size="sm" {...STYLE[shown]} label={e.state[shown]} />
      {at && <span className="text-ink-3">{e.stateAt.replace('{{at}}', formatDateTime(at, clock))}</span>}
    </p>
  );
}
