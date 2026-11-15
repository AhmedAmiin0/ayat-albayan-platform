import { useEffect, useEffectEvent, useRef } from 'react';
import { leaveAnchor } from './use-anchor-param';
import { useOwnSends } from './own-send';

/** A send from this device while anchored goes back to the live chat (its row shows there). */
export function useLeaveOnSend(phone: string, anchored: boolean): void {
  const sends = useOwnSends(phone);
  const seen = useRef(sends);
  const leave = useEffectEvent(() => {
    if (anchored) leaveAnchor();
  });
  useEffect(() => {
    if (sends === seen.current) return;
    seen.current = sends;
    leave();
  }, [sends]);
}
