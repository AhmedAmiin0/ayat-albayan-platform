import { RIYADH_TZ } from '@ab/shared';
import { useRef, useState } from 'react';
import { enterMeeting } from './api';
import { meetingError } from './meeting-text';

/** «ادخل الاجتماع» with its own busy flag and error line (times in `tz`, the viewer's); one call at a time. */
export function useEnterMeeting(tz: string = RIYADH_TZ) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const run = async (id: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      await enterMeeting(id);
    } catch (e) {
      setError(meetingError(e, tz));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };
  return { pending, error, run };
}
