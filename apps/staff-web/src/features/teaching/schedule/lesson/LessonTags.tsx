import type { LessonView } from '@ab/schedule';
import { isMakeup } from '@/features/teaching/booking/draft/contract';
import { NuqtaGlyph } from '@ab/web-kit/components/ui/display/nuqta-glyph';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { wasText } from '@/features/teaching/schedule/edit-time/edit-time-text';
import { timeEditInfo } from '@/features/teaching/schedule/edit-time/edit-time.contract';
import { useClock } from '@ab/web-kit/lib/clock';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';

const TAG = 'shrink-0 rounded-sm border border-gold px-1 text-2xs font-semibold text-ink-2';

/** The time-edited tag (R-SCH-11) is a muted note, not a button, with the old time as tooltip. */
export function LessonTags({ lesson }: { lesson: Pick<LessonView, 'trial' | 'makeup' | 'time_edit'> }) {
  const clock = { ...useClock(), tz: useViewerTz() };
  const edited = timeEditInfo(lesson);
  return (
    <>
      {lesson.trial && <span className={TAG}>{t.schedule.trialTag}</span>}
      {isMakeup(lesson) && <span className={TAG}>{t.booking.makeup.tag}</span>}
      {edited && (
        <span title={wasText(edited, clock)} className="inline-flex shrink-0 items-center gap-1 text-2xs font-semibold text-ink-3">
          <NuqtaGlyph shape="half" className="text-gold" />
          {t.lessons.timeEdit.tag}
        </span>
      )}
    </>
  );
}
