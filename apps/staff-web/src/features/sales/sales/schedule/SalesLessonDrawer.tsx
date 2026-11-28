import { isRunningLesson, type SalesScheduleLesson } from '@ab/shared';
import { useState } from 'react';
import { StatusChip, Drawer, t } from '@ab/web-kit';
import { EnterButton } from '@/features/teaching/classroom';
import { studentNames } from '@/features/teaching/schedule';
import { CorrectOutcome } from '@/features/teaching/schedule';
import { SalesCorrectLesson } from './correct/SalesCorrectLesson';
import { SalesConfirmLesson } from './SalesConfirmLesson';
import { SalesMoveLesson } from './move';
import { SalesLessonDetails } from './SalesLessonDetails';
import { useSalesLessonRights } from './use-sales-lesson-rights';

export interface SalesLessonDrawerProps {
  lesson: SalesScheduleLesson;
  now: Date;
  onClose: () => void;
}

interface StepsProps {
  lesson: SalesScheduleLesson;
  now: Date;
  /** Under a running lesson's join button the confirm is outlined (one filled button). */
  running: boolean;
  confirmed: boolean;
  onConfirmed: () => void;
}

/** Each action needs its permission and lesson state; confirm only while it is required. */
function SalesLessonSteps({ lesson, now, running, confirmed, onConfirmed }: StepsProps) {
  const { confirmable, correctable, outcome, moves } = useSalesLessonRights(lesson, now);
  const readOnly = ![confirmable, confirmed, correctable, outcome, moves].some(Boolean);
  return (
    <>
      {confirmable && (
        <SalesConfirmLesson lessonId={lesson.id} secondary={running} onConfirmed={onConfirmed} />
      )}
      {confirmed && (
        <p role="status" className="text-sm text-ink-2">{t.sales.lessonActions.confirmed}</p>
      )}
      {moves && <SalesMoveLesson lesson={lesson} />}
      {correctable && (
        <SalesCorrectLesson lessonId={lesson.id} autoHeld={false} />
      )}
      {outcome && <CorrectOutcome lesson={lesson} area="sales" />}
      {readOnly && <p className="text-xs text-ink-3">{t.lessons.sheet.readOnly}</p>}
    </>
  );
}

/** She joins a running lesson as the classroom assistant (docs/16); render it conditionally. */
export function SalesLessonDrawer({ lesson, now, onClose }: SalesLessonDrawerProps) {
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const justConfirmed = confirmedId === lesson.id;
  const shown = justConfirmed ? { ...lesson, status: 'confirmed' as const } : lesson;
  const running = isRunningLesson(lesson, now);
  return (
    <Drawer title={studentNames(lesson) || t.lessons.details} onClose={onClose}>
      <div role="group" aria-label={t.lessons.details} className="grid gap-5">
        <SalesLessonDetails lesson={shown} />
        {running && (
          <div className="grid gap-1.5">
            <StatusChip tone="ok" glyph="fill" size="sm" label={t.sales.academySchedule.liveNow} className="justify-self-start" />
            <EnterButton lesson={lesson} className="justify-items-stretch" />
          </div>
        )}
        <SalesLessonSteps
          lesson={shown}
          now={now}
          running={running}
          confirmed={justConfirmed}
          onConfirmed={() => setConfirmedId(lesson.id)}
        />
      </div>
    </Drawer>
  );
}
