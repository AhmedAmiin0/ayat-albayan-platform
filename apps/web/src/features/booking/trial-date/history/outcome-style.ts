import type { StatusStyle, TrialOutcome } from '@ab/shared';

// A trial date's outcome chip (docs/07 §6 grammar): upcoming / awaiting neutral, attended ok,
// absent bad (it did not happen), cancelled / moved muted and struck.
export const trialOutcomeStyle: Record<TrialOutcome, StatusStyle> = {
  upcoming: { tone: 'neutral', glyph: 'hollow' },
  awaiting: { tone: 'neutral', glyph: 'half' },
  attended: { tone: 'ok', glyph: 'fill' },
  absent: { tone: 'bad', glyph: 'struck' },
  cancelled: { tone: 'neutral', glyph: 'struck' },
  moved: { tone: 'neutral', glyph: 'half' },
};
