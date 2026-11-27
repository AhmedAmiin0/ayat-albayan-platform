import { t, useViewerTz } from '@ab/web-kit';

export function useScheduleNotes() {
  const tz = useViewerTz();
  const S = t.portal.app.schedule;
  return { tz, S };
}
