import { useQuery } from '@tanstack/react-query';
import { usePermissions } from '@/features/people/auth';
import { coursePauseQuery } from './api';
import { CoursePauseBanner } from './CoursePauseBanner';
import { PauseHistory } from './PauseHistory';

interface CoursePausePanelProps {
  studentId: string;
  /** «استُؤنفت الدورة» / «حُفظت نهاية الإيقاف»: the page's toast (the banner goes once resumed). */
  onDone: (message: string) => void;
}

/**
 * The student file's pause block: the banner while a pause is open (with «استئناف» / «تغيير نهاية الإيقاف»
 * for courses.pause) and «سجل الإيقاف». Nothing at all for a student never paused.
 */
export function CoursePausePanel({ studentId, onDone }: CoursePausePanelProps) {
  const { data } = useQuery(coursePauseQuery(studentId));
  const { can } = usePermissions();
  const open = data?.open ?? null;
  const history = data?.history ?? [];
  if (!open && history.length === 0) return null;
  return (
    <div className="mb-5 grid gap-2">
      {open && <CoursePauseBanner studentId={studentId} pause={open} canEdit={can('courses.pause')} onDone={onDone} />}
      <PauseHistory history={history} />
    </div>
  );
}
