import { useQuery } from '@tanstack/react-query';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { FormAlert } from '@/components/ui/form/form-alert';
import { PendingReports } from '@/features/reporting/reports';
import { teacherMeQuery, TrialChatNote } from '@/features/teaching/teacher';
import { AttendanceLog } from '@/features/teaching/teacher-board';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { useViewerTz } from '@/lib/viewer-tz';
import { teacherStudentHeadQuery } from './api';
import { CourseLine } from './CourseLine';
import { FileHead } from './FileHead';
import { UpcomingLessons } from './UpcomingLessons';

/** Not hers (404) or not a teacher (403): the page is not hers to open. */
const notHers = (e: unknown): boolean =>
  e instanceof ApiError && (e.status === 403 || e.status === 404);

export interface TeacherStudentFileProps {
  studentId: string;
}

/**
 * «ملف الطالب» (docs/47, docs/49): name, code and status, the trial note, the course line and
 * this student's pending reports; then the next 14 days and the month log. No tabs: each
 * lesson row opens its own report and recording (a #recording-<id> link opens that row).
 */
export function TeacherStudentFile({ studentId }: TeacherStudentFileProps) {
  const head = useQuery(teacherStudentHeadQuery(studentId));
  const me = useQuery(teacherMeQuery);
  const viewer = useViewerTz();
  const tz = me.data?.tz ?? viewer;
  if (head.isError) {
    return <FormAlert>{notHers(head.error) ? t.common.forbidden : t.common.error}</FormAlert>;
  }
  if (!head.data || me.isPending) return <ListSkeleton />;
  const data = head.data;
  return (
    <>
      <FileHead head={data} />
      <TrialChatNote status={data.status} />
      <CourseLine course={data.course} tz={tz} />
      <PendingReports tz={tz} studentId={studentId} />
      <UpcomingLessons rows={data.upcoming} studentId={studentId} tz={tz} />
      <AttendanceLog studentId={studentId} tz={tz} />
    </>
  );
}
