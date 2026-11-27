import { tzCity, t } from '@ab/web-kit';
import { useScheduleNotes } from './use-schedule-notes';

/** The quiet notes under the week: whose clock the times are on, and when joining opens. */
export function ScheduleNotes() {
  const { tz, S } = useScheduleNotes();
  return (
    <div className="grid gap-1 text-xs text-ink-3">
      <p>{S.tzNote.replace('{zone}', tzCity(tz) ?? tz)}</p>
      <p>{S.joinNote}</p>
      <p>{t.portal.app.lesson.roomNote}</p>
    </div>
  );
}
