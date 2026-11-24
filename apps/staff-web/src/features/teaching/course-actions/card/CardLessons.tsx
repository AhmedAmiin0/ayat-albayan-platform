import type { CourseCardLesson } from '@ab/shared';
import { clockOf } from '@ab/time';
import { useState } from 'react';
import { StatusChip } from '@ab/web-kit/components/ui/display/status-chip';
import { useClock } from '@ab/web-kit/lib/clock';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useLessonStatusText } from '@ab/web-kit/lib/settings/lesson-status-text';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';
import { dayIn } from '@/features/teaching/schedule';
import { CardLessonDrawer } from './CardLessonDrawer';

interface CardLessonsProps {
  lessons: readonly CourseCardLesson[];
  /** After a write from a lesson's drawer: what it did. */
  onDone: (message: string) => void;
}

/** Times in the viewer's zone; a row opens the lesson's drawer. */
export function CardLessons({ lessons, onDone }: CardLessonsProps) {
  const tz = useViewerTz();
  const clock = useClock();
  const status = useLessonStatusText();
  const [open, setOpen] = useState<CourseCardLesson | null>(null);
  const day = dayIn(tz);
  return (
    <section aria-label={t.courseCard.upcoming} className="grid gap-2">
      <h3 className="text-xs font-semibold text-ink-3">
        {t.courseCard.upcoming} · {lessons.length}
      </h3>
      {lessons.length === 0 && <p className="text-sm text-ink-3">{t.courseCard.noUpcoming}</p>}
      <ul className="grid gap-1">
        {lessons.map((l) => (
          <li key={l.id}>
            <button
              type="button"
              onClick={() => setOpen(l)}
              className="flex w-full items-center justify-between gap-3 rounded-md bg-sunk px-3 py-2 text-start text-sm hover:bg-rule"
            >
              <span>
                {day(l.startsAt)} · {clockOf(new Date(l.startsAt), { ...clock, tz })}
              </span>
              <StatusChip {...status.chip(l.status)} size="sm" />
            </button>
          </li>
        ))}
      </ul>
      {open && <CardLessonDrawer lesson={open} onClose={() => setOpen(null)} onDone={onDone} />}
    </section>
  );
}
