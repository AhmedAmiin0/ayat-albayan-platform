import type { LessonView } from '@ab/shared';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { LessonChip } from './LessonChip';
import { teacherRows } from './lessons';
import { dayMonthLabel, weekDays, weekdayOf } from './tz';

export interface WeekGridProps {
  /** Saturday of the Riyadh week. */
  week: string;
  /** Today's Riyadh date (tinted column). */
  today: string;
  lessons: readonly LessonView[];
  onOpen: (lesson: LessonView) => void;
}

const weekday: Record<string, string> = t.enums.weekday;

/**
 * 7 Riyadh days across, one row per teacher (R-SCH-01): a real table, the double gold rule on
 * top (docs/07 §5), today tinted. It scrolls sideways inside the page under ~900px.
 */
export function WeekGrid({ week, today, lessons, onOpen }: WeekGridProps) {
  const days = weekDays(week);
  const rows = teacherRows(lessons);
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table aria-label={t.schedule.grid} className="w-full min-w-[880px] table-fixed border-collapse text-sm">
        <thead>
          <tr className="border-t-[3px] border-b-[3px] border-double border-gold">
            <th scope="col" className="w-[132px] px-2 py-2 text-start text-xs font-semibold text-ink-3">
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
            <tr key={row.teacher.id} className="border-b border-rule align-top">
              <th scope="row" className="px-2 py-2.5 text-start font-semibold">
                {row.teacher.display_name_ar}
              </th>
              {days.map((day) => (
                <td key={day} className={cn('px-1 py-1.5', day === today && 'bg-gold-wash/40')}>
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
