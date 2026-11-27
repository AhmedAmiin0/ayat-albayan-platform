import { shownOf, VIEW } from './read-state.views';
import type { ReadStateProps } from './ReadState.types';

/** Waits for every read so a failure never shows a false empty state; retry on failure. */
export function ReadState({ read, children }: ReadStateProps) {
  const shown = shownOf(read);
  return <>{VIEW[shown](read, children)}</>;
}
