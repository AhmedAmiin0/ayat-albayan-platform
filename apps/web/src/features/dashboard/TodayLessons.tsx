import { lessonStatusStyle, type LessonView } from '@ab/shared';
import { ListSkeleton } from '@/components/ui/skeleton';
import { StatusChip } from '@/components/ui/status-chip';
import { StaffJoinButton } from '@/features/classroom/StaffJoinButton';
import { useNow } from '@/features/classroom/use-now';
import { t } from '@/lib/i18n';
import { useJoinWindow } from '@/lib/public-config';
import { cn } from '@/lib/utils';
import { sectionTitle } from './Bar';
import { isLiveNow, todaysLessons } from './today';
import { teacherLabel } from '@/lib/teacher-label';

const CLOCK = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

/**
 * Folds by the card's own width (container query), not the screen's (owner 2026-10-18): the card is a
 * third of the dashboard on a wide screen, so the join buttons go under the details until it is 36rem.
 */
function LessonItem({ lesson, live }: { lesson: LessonView; live: boolean }) {
  const style = lessonStatusStyle[lesson.status];
  return (
    <li className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 border-b border-rule py-3.5 last:border-b-0 @xl:grid-cols-[4.5rem_minmax(0,1fr)_auto]">
      <span className="flex items-center gap-2">
        <span dir="ltr" className="text-lg font-semibold tabular-nums">
          {CLOCK.format(new Date(lesson.starts_at))}
        </span>
        {live && <span title={t.dashboard.home.live} className="size-2 rounded-full bg-ok motion-safe:animate-pulse" />}
      </span>
      <div className="grid min-w-0 gap-1">
        <p className="truncate font-semibold">{lesson.students.map((s) => s.name).join(t.common.listSeparator)}</p>
        <p className="text-sm text-ink-2">
          {t.dashboard.home.teacher.replace('{name}', teacherLabel(lesson.teacher))}
        </p>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <StatusChip size="sm" tone={style.tone} glyph={style.glyph} label={t.enums.lessonStatus[lesson.status]} />
          {live && <span className="text-xs font-semibold text-ok">{t.dashboard.home.live}</span>}
        </span>
      </div>
      {/* empty:hidden: a lesson without a room (StaffJoinButton renders nothing) adds no row gap. */}
      <div data-join className="col-start-2 empty:hidden @xl:col-start-3 @xl:row-start-1">
        <StaffJoinButton lesson={lesson} />
      </div>
    </li>
  );
}

/**
 * «حلقات اليوم» on the dashboard: time, students, teacher, status, a live dot while the room is
 * open, and «ادخل الحلقة» / «افتح الحلقة الآن» (the classroom's own staff button).
 */
export function TodayLessons({ lessons, className }: { lessons: LessonView[] | undefined; className?: string }) {
  const now = useNow();
  const win = useJoinWindow();
  const list = lessons ? todaysLessons(lessons) : undefined;
  return (
    <section aria-labelledby="dash-today" className={cn('@container grid content-start gap-2 rounded-md border border-rule p-4', className)}>
      <h2 id="dash-today" className={sectionTitle}>
        {t.dashboard.home.todayList}
      </h2>
      {!list && <ListSkeleton rows={3} />}
      {list?.length === 0 && (
        <div className="grid justify-items-center gap-1 py-8 text-center">
          <p className="font-semibold">{t.dashboard.home.todayEmpty}</p>
          <p className="max-w-[40ch] text-sm text-ink-3">{t.dashboard.home.todayEmptyHint}</p>
        </div>
      )}
      {list && list.length > 0 && (
        <ul className="max-h-[520px] overflow-y-auto overscroll-contain pe-1">
          {list.map((l) => (
            <LessonItem key={l.id} lesson={l} live={isLiveNow(l, now, win)} />
          ))}
        </ul>
      )}
    </section>
  );
}
