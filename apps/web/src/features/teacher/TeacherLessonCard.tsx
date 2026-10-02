import { clockTime, lessonStatusStyle, type LessonView } from '@ab/shared';
import { buttonVariants } from '@/components/ui/button';
import { StatusChip } from '@/components/ui/status-chip';
import { tzCity } from '@/components/ui/time-zone-select';
import { LessonReportLinks } from '@/features/reports/LessonReportLinks';
import { LessonActions } from '@/features/schedule/LessonActions';
import { studentNames, studentTimes } from '@/features/schedule/lessons';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { TeacherProposal } from './TeacherProposal';

export interface TeacherLessonCardProps {
  lesson: LessonView;
  /** The teacher's zone: times read «بتوقيتك». */
  tz: string;
  /** The teacher's fixed link, when the lesson has none of its own (R-LES-01). */
  fallbackLink: string | null;
  onDone: (message: string) => void;
}

/**
 * One lesson on the teacher dashboard (R-TCH-03, R-SCH-08): own time + each student's clock, the
 * status, «ادخل الحلقة», confirm / attendance for open lessons, and «اقترح ميعاد تاني» (or the
 * proposal waiting for the admin). 48px controls (docs/07 §4).
 */
export function TeacherLessonCard({ lesson, tz, fallbackLink, onDone }: TeacherLessonCardProps) {
  const style = lessonStatusStyle[lesson.status];
  const link = lesson.meeting_link ?? fallbackLink;
  return (
    <article
      aria-label={`${clockTime(new Date(lesson.starts_at), tz)} ${studentNames(lesson)}`}
      className={cn(
        'grid gap-3 border-b border-rule py-4',
        style.tone === 'act' && 'border-s-4 border-s-act ps-3',
      )}
    >
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="grid gap-0.5">
          <p className="flex items-baseline gap-2">
            <span dir="ltr" className="text-lg font-semibold tabular-nums">
              {clockTime(new Date(lesson.starts_at), tz)}
            </span>
            <span className="text-xs text-ink-3">{`${t.teacherDash.yourTime} (${tzCity(tz) ?? tz})`}</span>
          </p>
          <p className="text-body font-semibold">{studentNames(lesson)}</p>
          {studentTimes(lesson, tz).map((line) => (
            <p key={line} className="text-xs text-ink-2">{line}</p>
          ))}
        </div>
        <StatusChip {...style} label={t.enums.lessonStatus[lesson.status]} className="ms-auto" />
      </div>
      <div className="flex flex-wrap items-start gap-3">
        {link ? (
          <a href={link} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'secondary', size: 'lg' })}>
            {t.teacherDash.join}
          </a>
        ) : (
          <span className="text-sm text-ink-3">{t.lessons.noLink}</span>
        )}
        <LessonReportLinks lesson={lesson} role="teacher" size="lg" />
        <div className="min-w-0 flex-1">
          <LessonActions lesson={lesson} onDone={onDone} size="lg" />
        </div>
      </div>
      <TeacherProposal lesson={lesson} tz={tz} onDone={onDone} />
    </article>
  );
}
