import type { EvolutionState } from '@ab/shared';
import type { Glyph, Tone } from '@ab/money';
import { StatusChip, useClock, t } from '@ab/web-kit';
import { formatDateTime } from '@/features/sales/leads';
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
  /** Null means never known. */
  at: string | null;
}

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
