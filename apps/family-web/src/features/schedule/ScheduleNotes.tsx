import { tzCity } from '@ab/web-kit/ui';
import { t } from '@ab/web-kit/i18n';
import { useViewerTz } from '@ab/web-kit/lib';

/** The quiet notes under the week: whose clock the times are on, and when joining opens. */
export function ScheduleNotes() {
  const tz = useViewerTz();
  const S = t.portal.app.schedule;
  return (
    <div className="grid gap-1 text-xs text-ink-3">
      <p>{S.tzNote.replace('{zone}', tzCity(tz) ?? tz)}</p>
      <p>{S.joinNote}</p>
      <p>{t.portal.app.lesson.roomNote}</p>
    </div>
  );
}
