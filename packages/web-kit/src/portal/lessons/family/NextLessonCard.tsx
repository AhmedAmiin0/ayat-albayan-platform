import { isLessonNow, windowStateAt } from '@ab/client-core';
import type { PortalLesson, PortalStudent } from '@ab/shared';
import { useId } from 'react';
import { StarPattern } from '@ab/web-kit/components/family/ornament/StarPattern';
import { useClock } from '@ab/web-kit/lib/clock';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';
import { LessonAction } from '@ab/web-kit/portal/lessons/LessonAction';
import { LessonCountdown } from '@ab/web-kit/portal/lessons/LessonCountdown';
import { FamilyChip } from '@ab/web-kit/portal/lessons/options/FamilyChip';
import { FamilyLine } from '@ab/web-kit/portal/lessons/options/FamilyLine';
import { LessonOptionsBar } from '@ab/web-kit/portal/lessons/options/LessonOptionsBar';
import { dayName, spanText, viewerLine, withLine } from './lesson-text';
import { OpenPill } from './OpenPill';
import { WithRoom } from './WithRoom';

/** The countdown ticks every second; the join button turns on by itself at the window. */
const TICK_MS = 1_000;

const TIMER =
  'justify-self-start rounded-full bg-white/10 px-3 font-latin text-base font-bold text-fam-gold sm:text-lg';

interface Props {
  lesson: PortalLesson;
  student: PortalStudent;
  /** A student's own page: «حلقتك القادمة». */
  own: boolean;
}

/**
 * The next lesson on the emerald card (boards PortalWebHome, PortalPhoneHome): «الحلقة القادمة»
 * with «الدخول متاح الآن» (or its chip), the day and time, the live countdown, the gold
 * «ادخل الحلقة» and where the room opens; what the family asked and «خيارات الحلقة» on a white
 * strip under it, shown only when there is something to say or do. Same parts as the plain card.
 */
export function NextLessonCard({ lesson, student, own }: Props) {
  const id = useId();
  const now = useNow(TICK_MS);
  const clock = { ...useClock(), tz: student.tz };
  const viewer = viewerLine(lesson.starts_at, clock, useViewerTz());
  const open = windowStateAt(lesson.window, now) === 'open' || isLessonNow(lesson, now);
  const title = own ? t.portal.app.lesson.nextLessonSelf : t.portal.nextLesson;
  return (
    <WithRoom>
      {(onJoined) => (
        <section aria-labelledby={id} className="relative grid gap-3.5 overflow-hidden rounded-[20px]
          bg-[image:var(--fam-hero)] p-5 text-fam-hero-ink shadow-[0_14px_30px_rgba(14,74,55,0.25)]">
          <StarPattern />
          <div className="relative flex min-h-7 flex-wrap items-center justify-between gap-2.5">
            <h2 id={id} className="text-sm font-bold text-fam-hero-ink-2">{title}</h2>
            {open ? <OpenPill /> : <FamilyChip lesson={lesson} />}
          </div>
          <div className="relative grid gap-0.5">
            <p className="text-lg font-extrabold leading-snug sm:text-[22px]">
              {`${dayName(lesson, clock, now)} · ${spanText(lesson, clock)}`}
            </p>
            <p className="text-sm text-fam-hero-ink-2">{withLine(lesson)}</p>
            {viewer && <p className="text-xs text-fam-hero-ink-2">{viewer}</p>}
          </div>
          <div className="relative grid gap-2.5">
            <LessonCountdown lesson={lesson} now={now} className={TIMER} />
            <LessonAction lesson={lesson} studentId={student.id} tz={student.tz} now={now}
              onJoined={onJoined} tone="hero" />
            {lesson.way_in === 'classroom' && (
              <p className="text-[13px] text-fam-hero-ink-2">{t.portal.app.lesson.roomNote}</p>
            )}
          </div>
          <div className="relative hidden gap-2 rounded-2xl bg-raised p-3 text-ink has-[button,p]:grid">
            <FamilyLine lesson={lesson} student={student} now={now} />
            <LessonOptionsBar lesson={lesson} student={student} now={now} />
          </div>
        </section>
      )}
    </WithRoom>
  );
}
