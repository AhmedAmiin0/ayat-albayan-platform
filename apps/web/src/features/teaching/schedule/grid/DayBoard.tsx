import type { LessonView, Span } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { buttonVariants } from '@/components/ui/form/button';
import { AXIS_HOURS } from '@/features/people/teachers/availability/track';
import { t } from '@/lib/i18n/i18n';
import { teacherLabel } from '@/lib/i18n/teacher-label';
import { cn } from '@/lib/utils';
import { LessonChip } from '@/features/teaching/schedule/lesson/LessonChip';
import { freeText, spanRange, teacherDay, type BoardRow } from '@/features/teaching/schedule/overview';
import { ScheduleTrack } from './ScheduleTrack';
import { TeacherCell } from './TeacherCell';
import { useClock } from '@/lib/clock';
import { useViewerTz } from '@/lib/viewer-tz';

export interface DayBoardProps {
  /** Riyadh day, "YYYY-MM-DD". */
  day: string;
  rows: readonly BoardRow[];
  now: Date;
  onOpen: (lesson: LessonView) => void;
}

const rowGrid = 'grid gap-x-4 gap-y-2 md:grid-cols-[184px_minmax(0,1fr)]';

/**
 * One Riyadh day across every teacher (R-SCH-01): a row per teacher (rows scale down the page;
 * columns would not fit 20 teachers), the 08–24 axis once on top. Each row: the teacher, the
 * visual track, then the accessible path: the day's lesson chips (open the drawer) and the free
 * gaps as outline links to the booking wizard with that teacher and start (R-SCH-06).
 */
export function DayBoard({ day, rows, now, onOpen }: DayBoardProps) {
  return (
    <section aria-label={t.schedule.dayBoard} className="border-t border-rule">
      <div aria-hidden="true" className={cn(rowGrid, 'sticky top-0 z-10 border-b border-rule bg-page py-1.5')}>
        <span className="max-md:hidden" />
        <span className="flex justify-between text-2xs text-ink-3 tabular-nums">
          {AXIS_HOURS.map((h) => (
            <span key={h}>{String(h).padStart(2, '0')}</span>
          ))}
        </span>
      </div>
      {rows.map((row) => (
        <TeacherDay key={row.teacher.id} row={row} day={day} now={now} onOpen={onOpen} />
      ))}
    </section>
  );
}

function TeacherDay({ row, day, now, onOpen }: { row: BoardRow } & Omit<DayBoardProps, 'rows'>) {
  const lessons = row.days.get(day) ?? [];
  const facts = teacherDay(row.teacher, { day, lessons, now, tz: useViewerTz() });
  return (
    <section aria-label={teacherLabel(row.teacher)} className={cn(rowGrid, 'border-b border-rule py-3')}>
      <TeacherCell teacher={row.teacher} now={now} photo={row.photo} />
      <div className="grid min-w-0 content-start gap-2">
        {facts.dayOff ? (
          <p className="border-s-2 border-danger ps-1.5 text-xs text-ink-2">
            {[t.schedule.dayOff, facts.dayOff.reason].filter(Boolean).join(' · ')}
          </p>
        ) : (
          <ScheduleTrack windows={facts.windows} off={facts.off} ticks={facts.ticks} />
        )}
        {lessons.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {lessons.map((lesson) => (
              <li key={lesson.id} className="w-full sm:w-48">
                <LessonChip lesson={lesson} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-ink-3">{t.schedule.noLessons}</p>
        )}
        {facts.windows.length === 0 && !facts.dayOff && <p className="text-xs text-ink-3">{t.schedule.noWindows}</p>}
        <FreeGaps teacherId={row.teacher.id} gaps={facts.gaps} day={day} />
      </div>
    </section>
  );
}

interface FreeGapsProps {
  teacherId: string;
  gaps: readonly Span[];
  day: string;
}

/** «فاضي 17:00 – 19:00»: dashed outline links (never filled, docs/07 rule 1), ≥ 44px on phones. */
function FreeGaps({ teacherId, gaps, day }: FreeGapsProps) {
  const clock = useClock();
  const tz = useViewerTz();
  if (gaps.length === 0) return null;
  return (
    <ul aria-label={t.booking.freeSlots} className="flex flex-wrap gap-1.5">
      {gaps.map((gap) => (
        <li key={gap.starts_at}>
          <Link
            to="/admin/book"
            search={{ teacherId, startsAt: gap.starts_at }}
            className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'border-dashed border-lapis/60 text-lapis tabular-nums')}
          >
            <span className="sr-only">{`${t.schedule.book}: `}</span>
            {freeText(spanRange(gap, day, tz), clock)}
          </Link>
        </li>
      ))}
    </ul>
  );
}
