import { canSalesChangeLesson, canSalesConfirm, isRunningLesson, type SalesScheduleLesson } from '@ab/shared';
import { useState } from 'react';
import { StatusChip } from '@/components/ui/display/status-chip';
import { usePermissions } from '@/features/people/auth';
import { EnterButton } from '@/features/teaching/classroom/join/JoinButton';
import { Drawer } from '@/features/teaching/schedule/Drawer';
import { studentNames } from '@/features/teaching/schedule/lesson/lessons';
import { t } from '@/lib/i18n/i18n';
import { usePublicConfig } from '@/lib/settings/public-config';
import { canSalesCorrect, isHeldLesson } from './correct/correctable';
import { SalesCorrectLesson } from './correct/SalesCorrectLesson';
import { SalesConfirmLesson } from './SalesConfirmLesson';
import { SalesMoveLesson } from './move';
import { SalesLessonDetails } from './SalesLessonDetails';

export interface SalesLessonDrawerProps {
  lesson: SalesScheduleLesson;
  now: Date;
  onClose: () => void;
}

interface StepsProps {
  lesson: SalesScheduleLesson;
  now: Date;
  /** Under a running lesson's «ادخل الحلقة» the confirm is outlined (one filled button). */
  running: boolean;
  /** Confirmed from this drawer: «أُكِّدت الحلقة». */
  confirmed: boolean;
  onConfirmed: () => void;
}

/**
 * What sales may do: «تأكيد الحلقة» on a scheduled lesson not ended (lessons.confirm), only while
 * the academy requires a confirmation; «لم تنعقد؟» (lessons.cancel) on a completed lesson or,
 * without the confirmation, an open one before or after its end (owner 2026-11-02); «تغيير الموعد»
 * (lessons.reschedule) on an open lesson not ended; else read-only.
 */
function SalesLessonSteps({ lesson, now, running, confirmed, onConfirmed }: StepsProps) {
  const { can } = usePermissions();
  const required = usePublicConfig().lesson_confirmation_required;
  const confirmable = required && canSalesConfirm(lesson, { now, holds: can('lessons.confirm') });
  const correctable = canSalesCorrect(lesson, { now, required, holds: can('lessons.cancel') });
  const moves = canSalesChangeLesson(lesson, { now, can }).reschedule;
  const readOnly = ![confirmable, confirmed, correctable, moves].some(Boolean);
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
        <SalesCorrectLesson lessonId={lesson.id} autoHeld={isHeldLesson(lesson)} />
      )}
      {readOnly && <p className="text-xs text-ink-3">{t.lessons.sheet.readOnly}</p>}
    </>
  );
}

/**
 * The admin lesson drawer for sales (owner 2026-10-26): the same panel and details, and on a
 * running lesson «جارية الآن» with «ادخل الحلقة» (she joins as the classroom assistant, docs/16),
 * then SalesLessonSteps (owner 2026-10-28, 2026-11-02). No edit, invoice or report action.
 * Render it conditionally.
 */
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
