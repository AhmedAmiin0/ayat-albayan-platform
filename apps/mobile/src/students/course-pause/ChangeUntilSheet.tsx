import type { CoursePauseView } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { ChangeUntilForm } from './ChangeUntilForm';
import { PauseSheetFrame } from './PauseSheetFrame';

interface ChangeUntilSheetProps {
  studentId: string;
  /** The open pause to change; null = closed. */
  pause: CoursePauseView | null;
  onClose: () => void;
  onDone: () => void;
}

/** «نهاية الإيقاف» as a page sheet over the student's file. */
export function ChangeUntilSheet({ studentId, pause, onClose, onDone }: ChangeUntilSheetProps) {
  return (
    <PauseSheetFrame open={pause !== null} title={t.coursePause.changeUntilTitle} onClose={onClose}>
      {pause ? <ChangeUntilForm studentId={studentId} pause={pause} onDone={onDone} onClose={onClose} /> : null}
    </PauseSheetFrame>
  );
}
