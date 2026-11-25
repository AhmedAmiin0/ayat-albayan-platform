import { coursePauseBanner } from '@ab/client-core';
import type { CoursePauseView } from '@ab/shared';
import { riyadhToday } from '@ab/time';
import { useState } from 'react';
import { Button, t } from '@ab/web-kit';
import { dateLabel } from '@/features/teaching/schedule';
import { ChangeUntilDialog } from './ChangeUntilDialog';
import { ResumeCourseDialog } from './ResumeCourseDialog';

interface CoursePauseBannerProps {
  studentId: string;
  /** The open pause (started or starting later). */
  pause: CoursePauseView;
  /** Resume and change the end need courses.pause. */
  canEdit: boolean;
  /** A toast for the parent (the banner itself goes once the course is resumed). */
  onDone: (message: string) => void;
}

export function CoursePauseBanner({ studentId, pause, canEdit, onDone }: CoursePauseBannerProps) {
  const [open, setOpen] = useState<'resume' | 'until' | null>(null);
  // academy day (docs/34 b): the API's pause days are Riyadh days
  const lines = coursePauseBanner({
    pause,
    today: riyadhToday(),
    words: t.coursePause,
    formatDate: dateLabel,
  });
  const done = (message: string) => {
    setOpen(null);
    onDone(message);
  };
  return (
    <section aria-labelledby={`pause-${pause.id}`} className="grid gap-3 rounded-md bg-lapis-wash px-4 py-3.5">
      <div className="grid gap-1">
        <h2 id={`pause-${pause.id}`} className="text-sm font-semibold text-ink">
          {lines.title}
        </h2>
        {lines.starts && <p className="text-sm text-ink-2">{lines.starts}</p>}
        {pause.reason && <p className="text-sm text-ink-2">{t.coursePause.bannerReason.replace('{reason}', pause.reason)}</p>}
      </div>
      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => setOpen('resume')}>
            {t.coursePause.resume}
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => setOpen('until')}>
            {t.coursePause.changeUntil}
          </Button>
        </div>
      )}
      {open === 'resume' && <ResumeCourseDialog studentId={studentId} onClose={() => setOpen(null)} onDone={done} />}
      {open === 'until' && <ChangeUntilDialog studentId={studentId} pause={pause} onClose={() => setOpen(null)} onDone={done} />}
    </section>
  );
}
