import type { UserRole } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { buttonVariants } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';

/**
 * «تسجيل الحلقة»: from a report row to the lesson's recording in the student's file (the teacher's
 * file opens that lesson's row at #recording-<id>, docs/49).
 */
export function RecordingLink({ studentId, lessonId, role, when }: { studentId: string; lessonId: string; role: UserRole; when: string }) {
  const props = { hash: `recording-${lessonId}`, params: { studentId }, className: buttonVariants({ variant: 'secondary', size: 'sm' }) };
  const label = t.studentRecordings.reportLinkOf.replace('{when}', when);
  const body = (
    <>
      {t.studentRecordings.reportLink}
    </>
  );
  return role === 'admin' ? (
    <Link to="/admin/students/$studentId" aria-label={label} {...props}>
      {body}
    </Link>
  ) : (
    <Link to="/teacher/students/$studentId" aria-label={label} {...props}>
      {body}
    </Link>
  );
}
