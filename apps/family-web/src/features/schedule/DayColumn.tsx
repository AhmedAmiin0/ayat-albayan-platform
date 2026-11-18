import type { DayWord, WeekDay } from '@ab/client-core';
import { dateText } from '@ab/shared';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';
import { cn } from '@ab/web-kit/lib/utils';
import { ScheduleRow } from './ScheduleRow';
import { dayBadge } from './week-days';

const WEEKDAY = { weekday: 'long' } as const;
const DAY = { day: 'numeric' } as const;
const NAME = { weekday: 'long', day: 'numeric', month: 'long' } as const;
const at = (day: string) => new Date(`${day}T12:00:00Z`);
const text = (day: string, fields: Intl.DateTimeFormatOptions) =>
  dateText(at(day), { tz: 'UTC', locale }, fields);

/** Today's tile: the gold edge, lifted, and wider on the desktop row (boards). */
const TODAY = 'border-gold bg-gold-wash shadow-fam-lift lg:flex-[1.45]';

const BADGE: Record<DayWord, string> = {
  today: 'bg-[image:var(--fam-gold-fill)] text-fam-on-gold',
  tomorrow: 'border border-fam-mint-rule bg-fam-mint text-fam-mint-ink',
};

/** A day of the week (boards: the seven tiles): its name and number, then its lessons. */
export function DayColumn({ day, today }: { day: WeekDay; today: string }) {
  const word = dayBadge(day.day, today);
  const id = `day-${day.day}`;
  const empty = day.lessons.length === 0;
  return (
    <section aria-labelledby={id} className={cn('min-w-0 content-start gap-3 rounded-[20px] border',
      'p-2.5 lg:flex-1', word === 'today' ? TODAY : 'border-rule bg-sunk',
      empty ? 'hidden lg:grid' : 'grid')}>
      <h2 id={id}
        className="grid justify-items-center gap-0.5 border-b border-rule pt-1 pb-2.5">
        {word && (
          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-extrabold', BADGE[word])}>
            {t.portal.app.lesson[word]}
          </span>
        )}
        <span className="sr-only">{text(day.day, NAME)}</span>
        <span aria-hidden="true" className="text-sm font-bold text-ink-2">
          {text(day.day, WEEKDAY)}
        </span>
        <span aria-hidden="true" className="text-[22px] font-extrabold leading-tight text-ink">
          {text(day.day, DAY)}
        </span>
      </h2>
      {empty ? (
        <p className="grid min-h-24 place-items-center rounded-2xl border border-dashed border-rule
          text-xs text-ink-3">
          {t.familyLook.pages.schedule.noLessons}
        </p>
      ) : (
        <ul className="grid gap-2">
          {day.lessons.map((entry) => (
            <ScheduleRow key={entry.lesson.id} entry={entry} />
          ))}
        </ul>
      )}
    </section>
  );
}
