import type { LessonView } from '@ab/shared';
import { useState } from 'react';
import { t } from '@/lib/i18n';
import { CancelForm } from './CancelForm';
import { Drawer } from './Drawer';
import { LessonActions } from './LessonActions';
import { LessonDetails } from './LessonDetails';
import { studentNames } from './lessons';
import { RescheduleForm } from './RescheduleForm';

export interface LessonDrawerProps {
  lesson: LessonView;
  onClose: () => void;
  /** Toast after a write; the drawer closes itself. */
  onDone: (message: string) => void;
}

type Mode = 'view' | 'cancel' | 'reschedule';

/**
 * Admin lesson drawer (R-SCH-03, R-SCH-07): details, then confirm / attendance, «تغيير الميعاد»
 * (slot picker, conflict → message → another slot) and «إلغاء الحلقة» (scope, by whom, reason).
 */
export function LessonDrawer({ lesson, onClose, onDone }: LessonDrawerProps) {
  const [mode, setMode] = useState<Mode>('view');
  const done = (message: string) => {
    onDone(message);
    onClose();
  };
  return (
    <Drawer title={studentNames(lesson) || t.lessons.details} onClose={onClose}>
      {mode === 'view' && (
        <>
          <LessonDetails lesson={lesson} />
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
    </Drawer>
  );
}
