import { useQuery } from '@tanstack/react-query';
import { useId, type ReactNode } from 'react';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Tabs, tabIds } from '@/components/ui/layout/tabs';
import { StudentRecordings } from '@/features/people/students';
import { PendingReports, StudentReportsBody } from '@/features/reporting/reports';
import { teacherMeQuery, TrialChatNote } from '@/features/teaching/teacher';
import { AttendanceLog } from '@/features/teaching/teacher-board';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { useViewerTz } from '@/lib/viewer-tz';
import { teacherStudentHeadQuery } from './api';
import { CourseLine } from './CourseLine';
import { FileHead } from './FileHead';
import type { FileTab } from './file-tabs';
import { UpcomingLessons } from './UpcomingLessons';

const TABS: { value: FileTab; label: string }[] = [
  { value: 'lessons', label: t.teacherBoard.lessonsTab },
  { value: 'reports', label: t.teacherBoard.reportsTab },
];

/** Not hers (404) or not a teacher (403): the page is not hers to open. */
const notHers = (e: unknown): boolean =>
  e instanceof ApiError && (e.status === 403 || e.status === 404);

export interface TeacherStudentFileProps {
  studentId: string;
  tab: FileTab;
  onTab: (tab: FileTab) => void;
}

/**
 * «ملف الطالب» (docs/47): name, code and status, the trial note, the course line and this
 * student's pending reports; then «الحلقات» (the next 14 days, then the month log) or
 * «التقارير» (the history, then the recordings, so a #recording-<id> link finds its row).
 */
export function TeacherStudentFile({ studentId, tab, onTab }: TeacherStudentFileProps) {
  const prefix = useId();
  const head = useQuery(teacherStudentHeadQuery(studentId));
  const me = useQuery(teacherMeQuery);
  const viewer = useViewerTz();
  const tz = me.data?.tz ?? viewer;
  if (head.isError) {
    return <FormAlert>{notHers(head.error) ? t.common.forbidden : t.common.error}</FormAlert>;
  }
  if (!head.data) return <ListSkeleton />;
  const data = head.data;
  const panels: Record<FileTab, () => ReactNode> = {
    lessons: () => (
      <>
        <UpcomingLessons rows={data.upcoming} studentId={studentId} tz={tz} />
        <AttendanceLog studentId={studentId} tz={tz} />
      </>
    ),
    reports: () => (
      <>
        <StudentReportsBody studentId={studentId} role="teacher" tz={tz} />
        <StudentRecordings studentId={studentId} role="teacher" />
      </>
    ),
  };
  const ids = tabIds(prefix, tab);
  return (
    <>
      <FileHead head={data} />
      <TrialChatNote status={data.status} />
      <CourseLine course={data.course} tz={tz} />
      <PendingReports tz={tz} studentId={studentId} />
      <Tabs label={t.teacherFile.tabs} tabs={TABS} value={tab} onChange={onTab} idPrefix={prefix} />
      <div role="tabpanel" id={ids.panel} aria-labelledby={ids.tab}>
        {panels[tab]()}
      </div>
    </>
  );
}
