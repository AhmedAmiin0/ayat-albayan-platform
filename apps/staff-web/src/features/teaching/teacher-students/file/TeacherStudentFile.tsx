import { useQuery } from '@tanstack/react-query';
import { ListSkeleton } from '@ab/web-kit/components/ui/display/skeleton';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { PendingReports } from '@/features/reporting/reports';
import { teacherMeQuery, TrialChatNote } from '@/features/teaching/teacher';
import { AttendanceLog } from '@/features/teaching/teacher-board';
import { ApiError } from '@ab/web-kit/lib/http/api';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';
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

/** No tabs (docs/47, docs/49): each lesson row opens its own report and recording. */
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
