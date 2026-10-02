import type { LessonView } from '@ab/shared';
import { useRef, useState } from 'react';
import { useFocusOnChange } from '@/components/ui/use-focus-on-change';
import { LessonReportLinks } from '@/features/reports/LessonReportLinks';
import { t } from '@/lib/i18n';
import { CancelForm } from './CancelForm';
import { Drawer } from './Drawer';
import { LessonActions } from './LessonActions';
import { LessonDetails } from './LessonDetails';
import { studentNames } from './lessons';
import { ProposalBox } from './ProposalBox';
import { RescheduleForm } from './RescheduleForm';

export interface LessonDrawerProps {
  lesson: LessonView;
  onClose: () => void;
  /** Toast after a write; the drawer closes itself. */
  onDone: (message: string) => void;
}

type Mode = 'view' | 'cancel' | 'reschedule';
const LABEL: Record<Mode, string> = {
  view: t.lessons.details,
  cancel: t.lessons.cancelTitle,
  reschedule: t.lessons.rescheduleTitle,
};

/**
 * Admin lesson drawer (R-SCH-03, R-SCH-07, R-SCH-08): details, a teacher's pending proposal, then
 * confirm / attendance, «تغيير الميعاد» (slot picker, conflict → message → another slot) and
 * «إلغاء الحلقة» (scope, by whom, reason). Switching form moves focus to it (it replaced the
 * button that had focus).
 */
export function LessonDrawer({ lesson, onClose, onDone }: LessonDrawerProps) {
  const [mode, setMode] = useState<Mode>('view');
  const panel = useRef<HTMLDivElement>(null);
  useFocusOnChange(panel, mode);
  const done = (message: string) => {
    onDone(message);
    onClose();
  };
  return (
    <Drawer title={studentNames(lesson) || t.lessons.details} onClose={onClose}>
      <div ref={panel} role="group" tabIndex={-1} aria-label={LABEL[mode]} className="grid gap-5 outline-none">
        {mode === 'view' && (
          <>
            <LessonDetails lesson={lesson} />
            <ProposalBox lesson={lesson} onDone={done} />
            <LessonReportLinks lesson={lesson} role="admin" />
            <LessonActions
              lesson={lesson}
              onDone={done}
              onCancel={() => setMode('cancel')}
              onReschedule={() => setMode('reschedule')}
            />
          </>
        )}
        {mode === 'cancel' && <CancelForm lesson={lesson} onBack={() => setMode('view')} onDone={done} />}
        {mode === 'reschedule' && <RescheduleForm lesson={lesson} onBack={() => setMode('view')} onDone={done} />}
      </div>
    </Drawer>
  );
}
