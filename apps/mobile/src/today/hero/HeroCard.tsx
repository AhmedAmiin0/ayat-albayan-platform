import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { LessonStatusChip } from '@/core/ui/feedback/LessonStatusChip';
import { lessonClock, studentNames } from '@/today/lib/lesson-text';
import type { Hero } from '@/today/lib/today-plan';
import { HeroActions } from './HeroActions';
import { HeroFrame } from './HeroFrame';
import { heroLead, heroSubtitle } from './hero-text';

interface HeroCardProps {
  hero: Hero;
  busy?: boolean;
  /** Why the last confirm was refused (the status already rolled back). */
  error?: string;
  /** None: read-only (the salesperson's «اليوم»), see HeroActions. */
  onConfirm?: () => void;
  onDetails: () => void;
}

/**
 * «الحلقة التالية» (docs/29 §3): the lesson under way, else the next one, on the lapis wash: the lead
 * and the status chip, the local time large beside the students, then «تأكيد الحلقة» / «ادخل الحلقة»
 * and «التفاصيل» (no confirm when read-only). The live classroom of the old «جلسات مباشرة» lives here and in the sheet.
 */
export function HeroCard({ hero, busy = false, error, onConfirm, onDetails }: HeroCardProps) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const { lesson } = hero;
  return (
    <HeroFrame
      lead={heroLead(hero)}
      chip={<LessonStatusChip status={lesson.status} size="sm" />}
      time={lessonClock(lesson.starts_at, tz, cycle)}
      names={studentNames(lesson)}
      subtitle={heroSubtitle(lesson, cycle, tz)}
    >
      {error ? <ErrorLine message={error} /> : null}
      <HeroActions
        lesson={lesson}
        running={hero.kind === 'running'}
        busy={busy}
        onConfirm={onConfirm}
        onDetails={onDetails}
      />
    </HeroFrame>
  );
}
