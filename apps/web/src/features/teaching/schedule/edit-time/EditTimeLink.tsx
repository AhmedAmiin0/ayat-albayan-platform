import type { LessonView } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { wasText } from './edit-time-text';
import { timeEditInfo, timeEditMode } from './edit-time.contract';
import { useClock } from '@/lib/clock';

/**
 * Under the time in the drawer (R-SCH-11): «كان: …» and «السبب: …» once it was edited (the
 * «اتعدّل الوقت» tag sits with the status), and «عدّل الوقت» whenever the API allows it
 * (`time_edit_mode`; never for a teacher or a closed lesson) with what it keeps: the same lesson,
 * report and payments. «غيّر الميعاد» below is the other one: it closes this lesson and books a new one.
 * The button fills its column (docs/07 «الأزرار»: never shrink-wrapped).
 */
export function EditTimeLink({ lesson, onEdit }: { lesson: LessonView; onEdit?: (() => void) | undefined }) {
  const clock = useClock();
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
