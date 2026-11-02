import type { SalesScheduleLesson } from '@ab/shared';
import { useState, type ReactNode } from 'react';
import { CancelForm } from '@/features/teaching/schedule';
import { SalesChangeRow } from './SalesChangeRow';
import { salesCancelRoute } from './sales-lesson-api';
import { SalesRescheduleForm } from './SalesRescheduleForm';

type Mode = 'idle' | 'cancel' | 'move';

export interface SalesLessonActionsProps {
  lesson: SalesScheduleLesson;
  /** canSalesChangeLesson: which of the two she may use on this lesson. */
  allowed: { reschedule: boolean; cancel: boolean };
  /** «تأكيد الحلقة» when it applies: hidden while a form is open (one path, UX 2026-10-29). */
  confirm?: ReactNode;
  /** Once a move or cancel lands: the drawer drops «للاطلاع فقط» under the done line. */
  onChanged?: () => void;
}

/** Sales cancel this lesson only: the admin's form without «كل اللي بعدها». */
const oneLesson = (id: string) => ({ id, rule_id: null });

/**
 * The assistant's actions in the /sales lesson drawer (owner 2026-11-02 «I want assistant to be
 * able to cancel»; docs/16 row 37): «تغيير الموعد» | «إلغاء الحلقة», each behind its key, opening
 * the admin's forms in place (CancelForm: who cancelled and why, on her route;
 * SalesRescheduleForm on her slots).
 */
export function SalesLessonActions({
  lesson,
  allowed,
  confirm,
  onChanged,
}: SalesLessonActionsProps) {
  const [mode, setMode] = useState<Mode>('idle');
  const [done, setDone] = useState<string | null>(null);
  const back = () => setMode('idle');
  const finish = (message: string) => {
    setDone(message);
    setMode('idle');
    onChanged?.();
  };
  if (done)
    return (
      <p role="status" className="text-sm text-ink-2">
        {done}
      </p>
    );
  const views: Record<Mode, () => ReactNode> = {
    cancel: () => (
      <CancelForm
        lesson={oneLesson(lesson.id)}
        route={salesCancelRoute(lesson.id)}
        onBack={back}
        onDone={finish}
      />
    ),
    move: () => <SalesRescheduleForm lesson={lesson} onBack={back} onDone={finish} />,
    idle: () => (
      <div className="grid gap-2">
        {confirm}
        <SalesChangeRow allowed={allowed} onPick={setMode} />
      </div>
    ),
  };
  return views[mode]();
}
