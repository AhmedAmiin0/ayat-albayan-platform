import { RIYADH_TZ } from '@ab/shared';
import { useRef, useState } from 'react';
import { useRoomsInApp } from '@/classroom';
import { useClockCycle } from '@/core/lib/clock';
import { enterMeeting } from './api';
import { meetingError } from './meeting-text';

/** «ادخل الاجتماع» with its own busy flag and error line (times in `tz`, the viewer's); one call at a time. */
export function useEnterMeeting(tz: string = RIYADH_TZ) {
  const [pending, setPending] = useState(false);
  const cycle = useClockCycle();
  // The refusal itself, put in words while rendering: a later «تنسيق الوقت» switch re-words it.
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
