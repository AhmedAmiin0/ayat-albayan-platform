import { SectionHeader, t } from '@ab/web-kit';
import { dayId, longDay } from '@/features/schedule/day-text';
import { AgendaLesson } from '@/features/schedule/agenda/AgendaLesson';
import type { AgendaDayProps } from './AgendaDay.types';

/** The strip scrolls here under the sticky header and the ring flashes once. */
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
