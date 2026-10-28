import { canSalesConfirm, isRunningLesson, type SalesScheduleLesson } from '@ab/shared';
import { useState } from 'react';
import { StatusChip } from '@/components/ui/display/status-chip';
import { usePermissions } from '@/features/people/auth';
import { EnterButton } from '@/features/teaching/classroom/join/JoinButton';
import { Drawer } from '@/features/teaching/schedule/Drawer';
import { studentNames } from '@/features/teaching/schedule/lesson/lessons';
import { t } from '@/lib/i18n/i18n';
import { SalesConfirmLesson } from './SalesConfirmLesson';
import { SalesLessonDetails } from './SalesLessonDetails';

export interface SalesLessonDrawerProps {
  lesson: SalesScheduleLesson;
  now: Date;
  onClose: () => void;
}

/**
 * The admin lesson drawer for sales (owner 2026-10-26): the same panel and details, and on a running
 * lesson «جارية الآن» with «ادخل الحلقة» (she joins as the classroom assistant, docs/16). «تأكيد الحلقة»
 * on any scheduled lesson not ended yet (owner 2026-10-28, lessons.confirm; then it reads «مؤكدة»). No
 * edit, cancel, move, invoice or report action. Render it conditionally.
 */
export function SalesLessonDrawer({ lesson, now, onClose }: SalesLessonDrawerProps) {
  const holds = usePermissions().can('lessons.confirm');
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const justConfirmed = confirmedId === lesson.id;
  const shown = justConfirmed ? { ...lesson, status: 'confirmed' as const } : lesson;
  const confirmable = canSalesConfirm(shown, { now, holds });
  return (
    <Drawer title={studentNames(lesson) || t.lessons.details} onClose={onClose}>
      <div role="group" aria-label={t.lessons.details} className="grid gap-5">
        <SalesLessonDetails lesson={shown} />
        {isRunningLesson(lesson, now) && (
          <div className="grid justify-items-start gap-1.5">
            <StatusChip tone="ok" glyph="fill" size="sm" label={t.sales.academySchedule.liveNow} />
            <EnterButton lesson={lesson} />
          </div>
        )}
        {confirmable && <SalesConfirmLesson lessonId={lesson.id} onConfirmed={() => setConfirmedId(lesson.id)} />}
        {justConfirmed && <p role="status" className="text-sm text-ink-2">{t.sales.lessonActions.confirmed}</p>}
        {!confirmable && !justConfirmed && <p className="text-xs text-ink-3">{t.lessons.sheet.readOnly}</p>}
      </div>
    </Drawer>
  );
}
