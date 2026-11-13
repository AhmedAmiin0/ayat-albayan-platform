import type { TeacherStudentHead } from '@ab/shared';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useViewerTz } from '@/core/lib/clock';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { backWithin } from '@/core/nav/back-within';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Note } from '@/core/ui/feedback/Note';
import { FilterPills, type FilterPill } from '@/core/ui/form/FilterPills';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { BackButton } from '@/core/ui/navigation';
import { ltr } from '@/core/ui/primitives/Ltr';
import { useTeacherStudentHead } from '@/teacher/board/teacher-board-api';
import { TrialChatNote } from '@/teacher/components/TrialChatNote';
import { useTeacherMe } from '@/teacher/lib/queries';
import { CourseLine } from './CourseLine';
import { LogPane } from './LogPane';
import { PendingBlock } from './PendingBlock';
import { ReportsPane } from './ReportsPane';

/** The file's two panes (docs/47): «الحلقات» first, then «التقارير». */
type Pane = 'lessons' | 'reports';
const panes = (): FilterPill<Pane>[] => [
  { value: 'lessons', label: t.teacherBoard.lessonsTab },
  { value: 'reports', label: t.teacherBoard.reportsTab },
];

/** «AB-0182 · مشترك»: the code, then the student's status. */
const subtitleOf = (head: TeacherStudentHead): string =>
  `${ltr(head.code)} · ${t.enums.studentStatus[head.status]}`;

/** The API answers 404 for a student who is not hers (TeacherStudentAccess). */
const notHers = (error: unknown): boolean => error instanceof ApiError && error.status === 404;

interface WaitingProps {
  error: unknown;
  retry: () => void;
}

/** Before the head arrives: loading, «غير مسموح» for a student not hers, else a retry. */
function Waiting({ error, retry }: WaitingProps) {
  if (notHers(error)) return <EmptyState title={t.common.forbidden} />;
  return error ? <ErrorState onRetry={retry} /> : <Note>{t.common.loading}</Note>;
}

/** Name, then «AB-0182 · مشترك»; the file's title until the head arrives. */
function FileHeader({ head }: { head: TeacherStudentHead | undefined }) {
  return (
    <ScreenHeader
      title={head?.name ?? t.teacherFile.title}
      size="h2"
      connecting
      subtitle={head ? subtitleOf(head) : undefined}
      leading={<BackButton onPress={() => backWithin('/teacher/reports')} />}
    />
  );
}

interface FileBodyProps {
  head: TeacherStudentHead;
  tz: string;
  teacherId: string | undefined;
}

/** The trial note, the course, the pending reports, then the two panes. */
function FileBody({ head, tz, teacherId }: FileBodyProps) {
  const [pane, setPane] = useState<Pane>('lessons');
  const reports = <ReportsPane id={head.id} who={{ admin: false, teacherId }} tz={tz} />;
  return (
    <>
      <TrialChatNote status={head.status} />
      <CourseLine course={head.course} tz={tz} />
      <PendingBlock studentId={head.id} tz={tz} />
      <FilterPills
        items={panes()}
        value={pane}
        onChange={setPane}
        accessibilityLabel={t.teacherFile.tabs}
      />
      {pane === 'lessons' ? <LogPane id={head.id} upcoming={head.upcoming} tz={tz} /> : reports}
    </>
  );
}

/**
 * The teacher's student file (docs/47 PR 1, /teacher/reports/student/:id): name, code and status,
 * the trial note, the course (start, end, lessons used), this student's pending reports, then the
 * pills: «الحلقات» (next 14 days, then the month log with outcomes, reasons and report actions)
 * and «التقارير» (recordings, then every sent report). Dates in her zone (teachers.tz).
 */
export function TeacherStudentFileScreen() {
  const id = useLocalSearchParams<{ id?: string }>().id ?? '';
  const head = useTeacherStudentHead(id);
  const me = useTeacherMe();
  const viewer = useViewerTz();
  const tz = me.data?.tz ?? viewer;
  // Her zone first (review 11-11): no flash of the viewer's times; a failed /teachers/me
  // falls back to the viewer's.
  const ready = me.isPending ? undefined : head.data;
  return (
    <Screen>
      <FileHeader head={head.data} />
      {ready ? (
        <FileBody head={ready} tz={tz} teacherId={me.data?.id} />
      ) : (
        <Waiting error={head.error} retry={() => void head.refetch()} />
      )}
    </Screen>
  );
}
