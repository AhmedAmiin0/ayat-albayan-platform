import type { LessonView } from '@ab/shared';
import { EmptyState } from '@/components/ui/empty-state';
import { byLocalDay } from '@/features/schedule/slots';
import { dayMonthLabel, weekdayOf } from '@/features/schedule/tz';
import { t } from '@/lib/i18n';
import { TeacherLessonCard } from './TeacherLessonCard';

export interface LessonDayListProps {
  lessons: readonly LessonView[];
  /** The teacher's zone: days and times are theirs. */
  tz: string;
  fallbackLink: string | null;
  empty: string;
  onDone: (message: string) => void;
}

const weekday: Record<string, string> = t.enums.weekday;

/** The teacher's lessons under a heading per local day (one heading for «اليوم»). */
export function LessonDayList({ lessons, tz, fallbackLink, empty, onDone }: LessonDayListProps) {
  if (lessons.length === 0) return <EmptyState title={empty} />;
  return (
    <div className="grid gap-6">
      {[...byLocalDay(lessons, tz)].map(([day, list]) => (
        <section key={day} aria-label={`${weekday[String(weekdayOf(day))] ?? ''} ${dayMonthLabel(day)}`}>
          <h3 className="border-b-[3px] border-double border-gold pb-1.5 font-display text-h4 font-bold">
            {`${weekday[String(weekdayOf(day))] ?? ''} ${dayMonthLabel(day)}`}
          </h3>
          {list.map((lesson) => (
            <TeacherLessonCard key={lesson.id} lesson={lesson} tz={tz} fallbackLink={fallbackLink} onDone={onDone} />
          ))}
        </section>
      ))}
    </div>
  );
}
