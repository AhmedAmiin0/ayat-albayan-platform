import { CoursePauseSheet } from './CoursePauseSheet';
import { ResumeCourseDialog } from './ResumeCourseDialog';

/** Which student's course a list row pauses or resumes; subscriptionId: the package row's (sent with «استئناف»). */
export type CoursePauseTarget = { studentId: string; resume: boolean; subscriptionId?: string } | null;

interface CoursePauseDialogsProps {
  target: CoursePauseTarget;
  onClose: () => void;
  onDone: (message: string) => void;
}

/** A list's «إيقاف مؤقت» (the sheet) or «استئناف» (the confirm) for one row's student. */
export function CoursePauseDialogs({ target, onClose, onDone }: CoursePauseDialogsProps) {
  if (!target) return null;
  const props = { studentId: target.studentId, onClose, onDone };
  if (!target.resume) return <CoursePauseSheet {...props} />;
  return <ResumeCourseDialog {...props} {...(target.subscriptionId ? { subscriptionId: target.subscriptionId } : {})} />;
}
