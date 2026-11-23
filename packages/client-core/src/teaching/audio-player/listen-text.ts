import { formatClock } from './player-math.js';
import type { ListenState } from './resume.js';

export interface ListenWords {
  isNew: string;
  stoppedAt: string;
  heard: string;
}

/** A listen in the app's words; `wrap` isolates the clock in an RTL line (the app's ltr()). */
export function listenText(
  state: ListenState,
  words: ListenWords,
  wrap: (clock: string) => string = (clock) => clock,
): string {
  const at = state.kind === 'partial' ? state.at : 0;
  const text: Record<ListenState['kind'], () => string> = {
    new: () => words.isNew,
    partial: () => words.stoppedAt.replace('{at}', wrap(formatClock(at))),
    done: () => words.heard,
  };
  return text[state.kind]();
}
