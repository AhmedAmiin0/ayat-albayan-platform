import { nextLesson } from '@ab/client-core';
import type { PortalLessons, PortalStudent } from '@ab/shared';
import { useId } from 'react';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { SectionHeading } from '@ab/web-kit/family/layout/SectionHeading';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { cn } from '@ab/web-kit/lib/utils';
import { FamilyLessonCard } from './FamilyLessonCard';
import { FamilyPrepare } from './FamilyPrepare';
import { NextLessonCard } from './NextLessonCard';
import type { UpcomingLook } from './upcoming-look';

interface Props {
  lessons: PortalLessons;
  student: PortalStudent;
  look: UpcomingLook;
}

const CARD = 'rounded-[20px] border border-rule bg-raised p-4 shadow-fam-card';

/**
 * «القادمة» in the family look (boards PortalWebHome, PortalPhoneHome): on a wide screen the next
 * lesson on the emerald card with «ما المطلوب» under it beside «الحلقات القادمة» (the other
 * lessons of the 14 days, white cards); one column on a phone, in that order.
 */
export function FamilyLessons({ lessons, student, look }: Props) {
  const id = useId();
  const next = nextLesson(lessons.lessons, useNow());
  const rest = lessons.lessons.filter((lesson) => lesson !== next);
  const title = look.own ? t.portal.app.lesson.upcomingSelf : t.portal.app.lesson.upcoming;
  return (
    <div className={cn('grid items-start gap-6',
      rest.length > 0 && 'lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8')}>
      <div className="grid gap-6">
        {next && <NextLessonCard lesson={next} student={student} own={look.own} />}
        <FamilyPrepare lessons={lessons} student={student} look={look} />
        {lessons.lessons.length === 0 && (
          <EmptyState title={t.portal.lessonsEmpty}>{t.portal.lessonsEmptyHint}</EmptyState>
        )}
      </div>
      {rest.length > 0 && (
        <section aria-labelledby={id} className="grid gap-[18px]">
          <SectionHeading id={id} label={t.familyLook.child.upcomingLabel} title={title} />
          <ul className="grid gap-3">
            {rest.map((lesson) => (
              <li key={lesson.id} className={CARD}>
                <FamilyLessonCard lesson={lesson} student={student} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
