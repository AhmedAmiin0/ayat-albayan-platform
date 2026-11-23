import type { LessonView } from '@ab/schedule';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { wasText } from './edit-time-text';
import { timeEditInfo, timeEditMode } from './edit-time.contract';
import { useClock } from '@ab/web-kit/lib/clock';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';

/** Shown only when the API allows (`time_edit_mode`), never for a teacher or a closed lesson. */
export function EditTimeLink({ lesson, onEdit }: { lesson: LessonView; onEdit?: (() => void) | undefined }) {
  const clock = { ...useClock(), tz: useViewerTz() };
  const info = timeEditInfo(lesson);
  return (
    <>
      {info && <span className="block text-xs text-ink-2">{wasText(info, clock)}</span>}
      {info?.reason && <span className="block text-xs text-ink-2">{t.lessons.timeEdit.reasonLine.replace('{reason}', info.reason)}</span>}
      {onEdit && timeEditMode(lesson) && (
        <span className="mt-1.5 grid gap-1">
          <Button type="button" variant="secondary" onClick={onEdit}>
            {t.lessons.editTime}
          </Button>
          <span className="text-xs text-ink-3">{t.lessons.timeEdit.captionEdit}</span>
        </span>
      )}
    </>
  );
}
