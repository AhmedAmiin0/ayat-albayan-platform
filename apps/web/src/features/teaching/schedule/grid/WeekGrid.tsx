import type { LessonView, OverviewTeacher } from '@ab/shared';
import { useNarrow } from '@/components/ui/layout/use-narrow';
import { t } from '@/lib/i18n/i18n';
import { teacherLabel } from '@/lib/i18n/teacher-label';
import { cn } from '@/lib/utils';
import { LessonChip } from '../lesson/LessonChip';
import { teacherRows } from '../lesson/lessons';
import { boardRows, hoursText, teacherDay } from '../overview';
import { ScheduleTrack } from './ScheduleTrack';
import { TeacherCell } from './TeacherCell';
import { WeekAgenda } from './WeekAgenda';
import { dayMonthLabel, weekDays, weekdayOf } from '../tz';

export interface WeekGridProps {
  /** Saturday of the Riyadh week. */
  week: string;
  /** Today's Riyadh date (tinted column). */
  today: string;
  lessons: readonly LessonView[];
  onOpen: (lesson: LessonView) => void;
  /**
   * The all-teachers calendar: one row per teacher here, lessons or not, with their cell and each
   * day's track. Without it, rows come from the lessons (a single teacher's own week).
   */
  teachers?: readonly OverviewTeacher[];
  /** Free time counts from now on. */
  now?: Date;
}

const weekday: Record<string, string> = t.enums.weekday;

interface Row {
  id: string;
  name: string;
  teacher: OverviewTeacher | null;
  days: Map<string, LessonView[]>;
}

function rowsOf(lessons: readonly LessonView[], teachers: readonly OverviewTeacher[] | undefined): Row[] {
  if (teachers) return boardRows(teachers, lessons).map((r) => ({ ...r, id: r.teacher.id, name: teacherLabel(r.teacher) }));
  return teacherRows(lessons).map((r) => ({ id: r.teacher.id, name: teacherLabel(r.teacher), teacher: null, days: r.days }));
}

/**
 * 7 Riyadh days across, one row per teacher (R-SCH-01): a real table, the double gold rule on
 * top (docs/07 §5), today tinted. It scrolls sideways inside the page under ~900px.
 */
export function WeekGrid({ week, today, lessons, onOpen, teachers, now = new Date() }: WeekGridProps) {
  const days = weekDays(week);
  const rows = rowsOf(lessons, teachers);
  if (useNarrow()) return <WeekAgenda days={days} today={today} rows={rows} onOpen={onOpen} />;
  return (
    // Below lg the grid scrolls sideways: the end fade (as on the nav row) says more columns exist.
    <div className="ab-fade-end -mx-1 overflow-x-auto ps-5 pe-10 lg:px-1 lg:[mask-image:none]">
      <table aria-label={t.schedule.grid} className={cn('w-full table-fixed border-collapse text-sm', teachers ? 'min-w-[1100px]' : 'min-w-[920px]')}>
        <thead>
          <tr className="border-y border-rule">
            <th scope="col" className={cn('px-2 py-2 text-start text-xs font-semibold text-ink-3', teachers ? 'w-[184px]' : 'w-[132px]')}>
              {t.schedule.teacher}
            </th>
            {days.map((day) => (
              <th
                key={day}
                scope="col"
                aria-current={day === today ? 'date' : undefined}
                className={cn('px-1.5 py-2 text-start text-xs font-semibold text-ink-3', day === today && 'bg-gold-wash/40 text-ink')}
              >
                <span className="block">{weekday[String(weekdayOf(day))]}</span>
                <span className="block font-medium tabular-nums">
                  {day === today ? t.schedule.today : dayMonthLabel(day)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-rule align-top">
              <th scope="row" className="px-2 py-2.5 text-start font-semibold">
                {row.teacher ? <TeacherCell teacher={row.teacher} now={now} /> : row.name}
              </th>
              {days.map((day) => (
                <td key={day} className={cn('px-1 py-1.5', day === today && 'bg-gold-wash/40')}>
                  {row.teacher && <DayFacts teacher={row.teacher} day={day} lessons={row.days.get(day) ?? []} now={now} />}
                  <ul className="grid gap-1">
                    {(row.days.get(day) ?? []).map((lesson) => (
                      <li key={lesson.id}>
                        <LessonChip lesson={lesson} onOpen={onOpen} />
                      </li>
                    ))}
                  </ul>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface DayFactsProps {
  teacher: OverviewTeacher;
  day: string;
  lessons: readonly LessonView[];
  now: Date;
}

/** Above a day's chips: the mini 08–24 track and «فاضي 3:30», or one «إجازة» note for a day off. */
function DayFacts({ teacher, day, lessons, now }: DayFactsProps) {
  const facts = teacherDay(teacher, { day, lessons, now });
  if (facts.dayOff) {
    return (
      <p className="mb-1 border-s-2 border-danger ps-1.5 text-2xs text-ink-2">
        {[t.schedule.dayOff, facts.dayOff.reason].filter(Boolean).join(' · ')}
      </p>
    );
  }
  if (facts.windows.length === 0 && facts.off.length === 0 && facts.ticks.length === 0) return null;
  return (
    <div className="mb-1 grid gap-0.5">
      <ScheduleTrack windows={facts.windows} off={facts.off} ticks={facts.ticks} className="h-3" />
      {facts.freeMin > 0 && (
        <span className="text-2xs text-ink-3 tabular-nums">{t.schedule.freeTotal.replace('{h}', hoursText(facts.freeMin))}</span>
      )}
    </div>
  );
}
