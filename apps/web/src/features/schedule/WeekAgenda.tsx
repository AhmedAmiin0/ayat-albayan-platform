import type { LessonView } from '@ab/shared';
import { t } from '@/lib/i18n';
import { teacherLabel } from '@/lib/teacher-label';
import { cn } from '@/lib/utils';
import { LessonChip } from './LessonChip';
import { dayMonthLabel, weekdayOf } from './tz';

interface AgendaRow {
  id: string;
  teacher: { display_name_ar: string; display_name_en?: string | null } | null;
  name: string;
  days: ReadonlyMap<string, readonly LessonView[]>;
}

export interface WeekAgendaProps {
  days: readonly string[];
  today: string;
  rows: readonly AgendaRow[];
  onOpen: (lesson: LessonView) => void;
}

const weekday: Record<string, string> = t.enums.weekday;

/**
 * The week on a phone (under md): a heading per day, then each teacher's lessons of that day as
 * chips (the teacher's name only when there is more than one row), instead of 7 squeezed columns.
 */
export function WeekAgenda({ days, today, rows, onOpen }: WeekAgendaProps) {
  const named = rows.length > 1;
  return (
    <div role="group" aria-label={t.schedule.grid} className="grid gap-5">
      {days.map((day) => {
        const label = `${weekday[String(weekdayOf(day))] ?? ''} ${dayMonthLabel(day)}`;
        const active = rows.filter((r) => (r.days.get(day) ?? []).length > 0);
        return (
          <section key={day} aria-label={label} aria-current={day === today ? 'date' : undefined}>
            <h3 className={cn('border-b-[3px] border-double border-gold pb-1.5 font-display text-h4 font-bold', day === today && 'bg-gold-wash/40')}>
              {day === today ? `${label} · ${t.schedule.today}` : label}
            </h3>
            {active.length === 0 && <p className="py-2 text-sm text-ink-3">{t.schedule.noLessons}</p>}
            {active.map((row) => (
              <div key={row.id} className="grid gap-1 border-b border-rule py-2">
                {named && <p className="text-xs font-semibold text-ink-2">{row.teacher ? teacherLabel(row.teacher) : row.name}</p>}
                <ul className="grid gap-1">
                  {(row.days.get(day) ?? []).map((lesson) => (
                    <li key={lesson.id}>
                      <LessonChip lesson={lesson} onOpen={onOpen} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
