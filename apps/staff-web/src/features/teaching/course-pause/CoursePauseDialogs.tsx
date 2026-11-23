import { CoursePauseSheet } from './CoursePauseSheet';
import { ResumeCourseDialog } from './ResumeCourseDialog';

/** subscriptionId is the package row's, sent with resume. */
export type CoursePauseTarget = { studentId: string; resume: boolean; subscriptionId?: string } | null;

interface CoursePauseDialogsProps {
  target: CoursePauseTarget;
  onClose: () => void;
  onDone: (message: string) => void;
}

export function CoursePauseDialogs({ target, onClose, onDone }: CoursePauseDialogsProps) {
  if (!target) return null;
  const props = { studentId: target.studentId, onClose, onDone };
  if (!target.resume) return <CoursePauseSheet {...props} />;
  return <ResumeCourseDialog {...props} {...(target.subscriptionId ? { subscriptionId: target.subscriptionId } : {})} />;
}
