import type { PortalStudent } from '@ab/shared';
import { useId, type ReactNode } from 'react';
import { Initial } from '@ab/web-kit/components/family/brand/Initial';
import { HeroDate } from '@ab/web-kit/components/family/child/HeroDate';
import { StudentCode } from '@ab/web-kit/components/family/child/StudentCode';
import { useHeroTeacher } from '@ab/web-kit/components/family/child/use-hero-teacher';
import { Hero } from '@ab/web-kit/components/family/layout/Hero';
import { VerseArch } from '@ab/web-kit/components/family/ornament/VerseArch';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { ChildName } from './ChildName';

interface Props {
  student: PortalStudent;
  /** A student's own home: «أهلًا بك، يوسف» and no initial (board PortalWebStudentHome). */
  own?: boolean;
  /** In place of today's date: «كل الأبناء» on a child's own page (board PortalWebChild). */
  top?: ReactNode;
}

/**
 * The child's emerald hero (boards PortalWebHome, PortalPhoneHome): today's date, the gold
 * initial, the name as the page's h1, «المعلم/ة: …» when a lesson or report names the teacher,
 * and the student's code; the verse arch on wide screens only.
 */
export function ChildHead({ student, own = false, top }: Props) {
  const id = useId();
  const teacher = useHeroTeacher(student.id);
  return (
    <Hero labelledBy={id}>
      <div className="flex items-center justify-between gap-8">
        <div className="grid min-w-0 justify-items-start gap-3.5">
          {top ?? <HeroDate tz={student.tz} />}
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            {!own && <Initial name={student.name} size="lg" />}
            <div className="grid min-w-0 gap-1">
              <ChildName id={id} name={student.name} own={own} />
              <p className="text-sm leading-relaxed text-fam-hero-ink-2 sm:text-base">
                {teacher && `${t.portal.app.lesson.teacher.replace('{name}', teacher)} · `}
                <StudentCode code={student.code} />
              </p>
            </div>
          </div>
        </div>
        <VerseArch className="hidden lg:block" />
      </div>
    </Hero>
  );
}
