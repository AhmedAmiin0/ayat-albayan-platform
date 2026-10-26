import { useEffect } from 'react';
import { startRingtone } from '../rtc/ringtone';

/** Rings while `ringing` (an inbound call waits for this user); stops the moment it is taken or ends. */
export function useIncomingRing(ringing: boolean): void {
  useEffect(() => {
    if (!ringing) return;
    const tone = startRingtone();
    return () => tone.stop();
  }, [ringing]);
}
