import type { TeacherStudentHead } from '@ab/shared';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useViewerTz } from '@/core/lib/clock';
import {
  ApiError,
  t,
  EmptyState,
  ErrorState,
  FilterPills,
  type FilterPill,
  Screen,
  ScreenHeader,
  BackButton,
  ltr,
} from '@ab/mobile-kit';
import { backWithin } from '@/core/nav/back-within';
import { Note } from '@/core/ui/feedback/Note';
import { useTeacherStudentHead } from '@/teacher/board/teacher-board-api';
import { TrialChatNote } from '@/teacher/components/TrialChatNote';
import { useTeacherMe } from '@/teacher/lib/queries';
import { CourseLine } from './CourseLine';
import { LogPane } from './LogPane';
import { PendingBlock } from './PendingBlock';
import { ReportsPane } from './ReportsPane';

/** Lessons pane first, then reports (docs/47). */
type Pane = 'lessons' | 'reports';
const panes = (): FilterPill<Pane>[] => [
  { value: 'lessons', label: t.teacherBoard.lessonsTab },
  { value: 'reports', label: t.teacherBoard.reportsTab },
];

const subtitleOf = (head: TeacherStudentHead): string =>
  `${ltr(head.code)} · ${t.enums.studentStatus[head.status]}`;

/** The API answers 404 for a student who is not hers (TeacherStudentAccess). */
const notHers = (error: unknown): boolean => error instanceof ApiError && error.status === 404;

interface WaitingProps {
  error: unknown;
  retry: () => void;
}

/** A student not hers answers not allowed. */
function Waiting({ error, retry }: WaitingProps) {
  if (notHers(error)) return <EmptyState title={t.common.forbidden} />;
  return error ? <ErrorState onRetry={retry} /> : <Note>{t.common.loading}</Note>;
}

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

/** Teacher's student file (docs/47); dates in her zone (teachers.tz). */
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
