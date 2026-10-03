import { lessonWhenText, type LessonView } from '@ab/shared';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';
import { timeEditInfo, timeEditMode } from './edit-time.contract';
import { RIYADH_TZ } from './tz';

/**
 * Under the time in the drawer (R-SCH-11): «اتعدّل الوقت · كان …» once it was edited, and «عدّل الوقت»
 * whenever the API allows it (`time_edit_mode`; never for a teacher or a closed lesson). Different
 * from «غيّر الميعاد» below, which closes this lesson and books a new one.
 */
export function EditTimeLink({ lesson, onEdit }: { lesson: LessonView; onEdit?: (() => void) | undefined }) {
  const info = timeEditInfo(lesson);
  const was = info && t.lessons.timeEdit.was.replace('{when}', lessonWhenText(new Date(info.was.starts_at), RIYADH_TZ, locale));
  return (
    <>
      {info && (
        <span className="block text-xs text-ink-2">
          {[t.lessons.timeEdit.tag, was, info.reason].filter(Boolean).join(t.common.listJoiner)}
        </span>
      )}
      {onEdit && timeEditMode(lesson) && (
        <Button type="button" variant="ghost" size="sm" className="-ms-3 mt-0.5" onClick={onEdit}>
          {t.lessons.editTime}
        </Button>
      )}
    </>
  );
}
