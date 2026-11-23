import type { WeekDay } from '@ab/client-core';
import { SectionHeader } from '@ab/web-kit/surface';
import { t } from '@ab/web-kit/i18n';
import { dayId, longDay } from '#/features/schedule/day-text.ts';
import { AgendaLesson } from './AgendaLesson';

interface AgendaDayProps {
  day: WeekDay;
  today: boolean;
  guardian: boolean;
}

/**
 * A day of the agenda: «اليوم · الأحد 16 نوفمبر» (or the date) over its lessons. The strip scrolls
 * here (under the sticky header) and the ring flashes once (use-jump-to-day).
 */
export function AgendaDay({ day, today, guardian }: AgendaDayProps) {
  const text = longDay(day.day);
  const id = dayId(day.day);
  return (
    <section
      id={id}
      tabIndex={-1}
      aria-labelledby={`${id}-title`}
      className="relative grid scroll-mt-20 gap-2 focus:outline-none"
    >
      <span
        data-flash
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-lg opacity-0 ring-2 ring-lapis"
      />
      <SectionHeader
        id={`${id}-title`}
        title={today ? t.portal.app.schedule.today.replace('{day}', text) : text}
      />
      <ul className="grid gap-2">
        {day.lessons.map((entry) => (
          <AgendaLesson key={entry.lesson.id} entry={entry} guardian={guardian} />
        ))}
      </ul>
    </section>
  );
}
