import { useEffect, useEffectEvent } from 'react';

/** What the guard reads of react-navigation's `beforeRemove` event. */
export interface BeforeRemove {
  preventDefault: () => void;
  data: { action: { type: string } };
}

/** The app's navigator, as a `beforeRemove` subscription (navigation.addListener). */
export type BackSource = (listener: (e: BeforeRemove) => void) => () => void;

/** Only a step back is held: a sign-out (reset) or a replace still navigates away. */
const BACK: readonly string[] = ['GO_BACK', 'POP'];

/** Android back asks first instead of dropping the lesson; no navigator source does nothing. */
export function useLeaveGuard(source: BackSource | undefined, active: boolean, onAsk: () => void) {
  const ask = useEffectEvent(onAsk);
  useEffect(() => {
    if (!source || !active) return undefined;
    return source((e) => {
      if (!BACK.includes(e.data.action.type)) return;
      e.preventDefault();
      ask();
    });
  }, [source, active]);
}
