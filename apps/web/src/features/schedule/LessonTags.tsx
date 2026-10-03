import type { LessonView } from '@ab/shared';
import { isMakeup } from '@/features/booking/contract';
import { t } from '@/lib/i18n';

const TAG = 'shrink-0 rounded-sm border border-gold px-1 text-2xs font-semibold text-ink-2';

/** «تجريبية» on a trial (R-SCH-09) and «تعويضية» on a makeup (R-SCH-10): in the chip and the drawer. */
export function LessonTags({ lesson }: { lesson: LessonView }) {
  return (
    <>
      {lesson.trial && <span className={TAG}>{t.schedule.trialTag}</span>}
      {isMakeup(lesson) && <span className={TAG}>{t.booking.makeup.tag}</span>}
    </>
  );
}
