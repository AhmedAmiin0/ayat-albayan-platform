import {
  canSalesChangeLesson,
  canSalesConfirm,
  isRunningLesson,
  type SalesScheduleLesson,
} from '@ab/shared';
import { useState } from 'react';
import { StatusChip } from '@/components/ui/display/status-chip';
import { usePermissions } from '@/features/people/auth';
import { EnterButton } from '@/features/teaching/classroom/join/JoinButton';
import { Drawer } from '@/features/teaching/schedule/Drawer';
import { studentNames } from '@/features/teaching/schedule/lesson/lessons';
import { t } from '@/lib/i18n/i18n';
import { SalesLessonActions } from './lesson-actions';
import { SalesConfirmLesson } from './SalesConfirmLesson';
import { SalesLessonDetails } from './SalesLessonDetails';

export interface SalesLessonDrawerProps {
  lesson: SalesScheduleLesson;
  now: Date;
  onClose: () => void;
}

/**
 * The admin lesson drawer for sales (owner 2026-10-26): the same panel and details, and on a
 * running lesson «جارية الآن» with «ادخل الحلقة» (she joins as the classroom assistant, docs/16).
 * «تأكيد الحلقة» on any scheduled lesson not ended yet (owner 2026-10-28, lessons.confirm; then it
 * reads «مؤكدة»), outlined under a running lesson's «ادخل الحلقة» (docs/07 «الأزرار»: one filled
 * button). «تغيير الموعد» and «إلغاء الحلقة» on any open lesson not ended (owner 2026-11-02;
 * lessons.reschedule / lessons.cancel), the admin's forms (SalesLessonActions). «للاطلاع فقط» only
 * when none applies. No edit, invoice or report action. Render it conditionally.
 */
export function SalesLessonDrawer({ lesson, now, onClose }: SalesLessonDrawerProps) {
  const { can } = usePermissions();
  const holds = can('lessons.confirm');
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const justConfirmed = confirmedId === lesson.id;
  const shown = justConfirmed ? { ...lesson, status: 'confirmed' as const } : lesson;
  const confirmable = canSalesConfirm(shown, { now, holds });
  const allowed = canSalesChangeLesson(shown, { now, can });
  const readOnly = !confirmable && !justConfirmed && !allowed.reschedule && !allowed.cancel;
  const confirm = confirmable && (
    <SalesConfirmLesson
      lessonId={lesson.id}
      secondary={isRunningLesson(lesson, now)}
      onConfirmed={() => setConfirmedId(lesson.id)}
    />
  );
  return (
    <Drawer title={studentNames(lesson) || t.lessons.details} onClose={onClose}>
      <div role="group" aria-label={t.lessons.details} className="grid gap-5">
        <SalesLessonDetails lesson={shown} />
        {isRunningLesson(lesson, now) && (
          <div className="grid gap-1.5">
            <StatusChip
              tone="ok"
              glyph="fill"
              size="sm"
              label={t.sales.academySchedule.liveNow}
              className="justify-self-start"
            />
            <EnterButton lesson={lesson} className="justify-items-stretch" />
          </div>
        )}
        {justConfirmed && (
          <p role="status" className="text-sm text-ink-2">
            {t.sales.lessonActions.confirmed}
          </p>
        )}
        <SalesLessonActions lesson={shown} allowed={allowed} confirm={confirm} />
        {readOnly && <p className="text-xs text-ink-3">{t.lessons.sheet.readOnly}</p>}
      </div>
    </Drawer>
  );
}
