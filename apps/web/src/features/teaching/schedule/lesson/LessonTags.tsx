import type { LessonView } from '@ab/shared';
import { isMakeup } from '@/features/teaching/booking/draft/contract';
import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';
import { t } from '@/lib/i18n/i18n';
import { wasText } from '../edit-time/edit-time-text';
import { timeEditInfo } from '../edit-time/edit-time.contract';
import { useClock } from '@/lib/clock';
import { useViewerTz } from '@/lib/viewer-tz';

const TAG = 'shrink-0 rounded-sm border border-gold px-1 text-2xs font-semibold text-ink-2';

/**
 * «تجريبية» on a trial (R-SCH-09), «تعويضية» on a makeup (R-SCH-10). «اتعدّل الوقت» (R-SCH-11) is
 * a note, not a button: a nuqta and muted text without the pill, with «كان: …» as its tooltip.
 */
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
