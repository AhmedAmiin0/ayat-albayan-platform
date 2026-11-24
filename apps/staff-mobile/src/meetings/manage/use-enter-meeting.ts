import { useRef, useState } from 'react';
import { useRoomsInApp } from '@/classroom';
import { useClockCycle } from '@/core/lib/clock';
import { enterMeeting } from './api';
import { meetingError } from './meeting-text';

/** Times in the viewer's tz; one call at a time. */
export function useEnterMeeting(tz: string) {
  const [pending, setPending] = useState(false);
  const cycle = useClockCycle();
  // The refusal is worded at render so a later clock-format switch re-words it.
  const [failed, setFailed] = useState<{ error: unknown } | null>(null);
  const inFlight = useRef(false);
  const inApp = useRoomsInApp();
  const run = async (id: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setFailed(null);
    try {
      await enterMeeting(id, inApp);
    } catch (e) {
      setFailed({ error: e });
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };
  const error = failed ? meetingError(failed.error, cycle, tz) : null;
  return { pending, error, run };
}
