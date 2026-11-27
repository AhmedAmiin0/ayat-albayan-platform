import { t } from '@ab/web-kit';
import { ScheduleNotes } from '@/features/schedule/ScheduleNotes';
import { WeekBar } from '@/features/schedule/WeekBar';
import type { SchedulePageProps } from './SchedulePage.types';
import { Days } from './Days';
import { useSchedulePage } from './use-schedule-page';

/** On the viewer's clock; only a guardian answers for a lesson. */
export function SchedulePage({ student, kind }: SchedulePageProps) {
  const { week, own, guardian } = useSchedulePage({ student, kind });
  return (
    <section aria-labelledby="schedule-title" className="grid gap-4">
      <h1 id="schedule-title" className="font-display text-h2 font-bold">
        {own ? t.portal.app.schedule.mine : t.portal.app.schedule.title}
      </h1>
      <WeekBar week={week} />
      <Days week={week} guardian={guardian} />
      <ScheduleNotes />
    </section>
  );
}
