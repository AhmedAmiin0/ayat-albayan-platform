import { CoursePauseSheet } from './CoursePauseSheet';
import { ResumeCourseDialog } from './ResumeCourseDialog';

/** Which student's course a list row pauses or resumes. */
export type CoursePauseTarget = { studentId: string; resume: boolean } | null;

interface CoursePauseDialogsProps {
  target: CoursePauseTarget;
  onClose: () => void;
  onDone: (message: string) => void;
}

/** A list's «إيقاف مؤقت» (the sheet) or «استئناف» (the confirm) for one row's student. */
export function CoursePauseDialogs({ target, onClose, onDone }: CoursePauseDialogsProps) {
  if (!target) return null;
  const props = { studentId: target.studentId, onClose, onDone };
  return target.resume ? <ResumeCourseDialog {...props} /> : <CoursePauseSheet {...props} />;
}
