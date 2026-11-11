import type { ReportSummaryView, TeacherMe } from '@ab/shared';
import { useViewerTz } from '@/core/lib/clock';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { backWithin } from '@/core/nav/back-within';
import { useState } from 'react';
import { useStudentHref } from '@/core/nav/tree-base';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { BackButton } from '@/core/ui/navigation';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { FilterPills, type FilterPill } from '@/core/ui/form/FilterPills';
import { LazyList } from '@/core/ui/lists/LazyList';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { useStudentName } from '@/ops/reports/use-student-name';
import { RecordingsButton } from '@/student-file/recordings/RecordingsButton';
import { useTeacherMe } from '@/teacher/lib/queries';
import { openSigned } from '@/core/lib/http/open-signed';
import { ReportHistoryRow, reportFormHref } from '@/core/ui/lists/ReportRows';
import { TrialChatNote } from '@/teacher/components/TrialChatNote';
import { StudentLessonsPanel } from '@/teacher/board';

const teacherStudent = (me: TeacherMe | undefined, id: string) =>
  me?.students.find((s) => s.id === id);
const teacherStudentName = (me: TeacherMe | undefined, id: string): string =>
  teacherStudent(me, id)?.name ?? t.reports.history;

/** Who reads: the admin (any report, read-only) or the teacher (her own lessons' forms). */
type Who = { admin: true } | { admin: false; teacherId: string | undefined };

/**
 * A row's tap: the admin reads any report (`to`: in a chat group, its copy of the route); a
 * teacher opens only their own lesson's form.
 */
function rowPress(r: ReportSummaryView, who: Who, to: (href: Href) => Href) {
  if (who.admin) return () => router.push(to(`/students/reports/view/${r.id}`));
  const mine = r.teacher.id === who.teacherId;
  return mine ? () => router.push(reportFormHref(r.lesson_id)) : undefined;
}

const keyOf = (r: ReportSummaryView) => r.id;
const whoOf = (admin: boolean, me: TeacherMe | undefined): Who =>
  admin ? { admin: true } : { admin: false, teacherId: me?.id };

/** The teacher's switch (docs/46 C7): one group per view, never one long page. */
type Pane = 'reports' | 'lessons';
const panes = (): FilterPill<Pane>[] => [
  { value: 'reports', label: t.teacherBoard.reportsTab },
  { value: 'lessons', label: t.teacherBoard.lessonsTab },
];

interface ReportItemProps {
  row: ReportSummaryView;
  tz: string;
  who: Who;
  onPdfFailed: () => void;
}

/** A history row; the React Compiler keeps its handlers stable. */
function ReportItem({ row, tz, who, onPdfFailed }: ReportItemProps) {
  const onPdf = () => void openSigned(`/reports/${row.id}/pdf`).catch(onPdfFailed);
  const onPress = rowPress(row, who, useStudentHref());
  return <ReportHistoryRow row={row} tz={tz} onPdf={onPdf} onPress={onPress} />;
}

/** No report yet, or the first page failed (with a retry); nothing while it loads. */
function ReportsEmpty({
  loaded,
  failed,
  retry,
}: {
  loaded: boolean;
  failed: boolean;
  retry: () => void;
}) {
  if (loaded) return <EmptyState title={t.reports.noReports} />;
  return failed ? <ErrorState onRetry={retry} /> : null;
}

/** «التقارير»: the recordings way (a teacher's), then every sent report, newest first. */
function ReportsPane({ id, who }: { id: string; who: Who }) {
  const tz = useViewerTz();
  const list = usePagedList<ReportSummaryView>({ path: `/students/${id}/reports`, pageSize: 10 });
  const [error, setError] = useState(false);
  const pdfFailed = () => setError(true);
  return (
    <>
      {who.admin ? null : <RecordingsButton href={`/teacher/reports/student/recordings/${id}`} />}
      {error ? <ErrorLine message={t.reports.error.pdf_not_ready} /> : null}
      <LazyList
        paged={list}
        tabBar={false}
        keyExtractor={keyOf}
        renderItem={({ item }) => (
          <ReportItem row={item} tz={tz} who={who} onPdfFailed={pdfFailed} />
        )}
        ListEmptyComponent={
          <ReportsEmpty loaded={!!list.data} failed={list.isError} retry={list.refresh} />
        }
      />
    </>
  );
}

/**
 * «سجل التقارير» of one of my students (R-REP-05, R-TCH-03): every sent report, newest first, with
 * its PDF once it is ready. The API allows only a student I teach. ponytail: no grade chart here
 * (the web has it); add it when teachers ask. Compact h2 title, the rows in one inset card (owner
 * 2026-10-28). A teacher switches to «الحلقات» (docs/46 C7): the board window's lessons, counts and
 * «سجل الحضور».
 */
export function StudentReportsScreen({ admin = false }: { admin?: boolean }) {
  const id = useLocalSearchParams<{ id?: string }>().id ?? '';
  const me = useTeacherMe(!admin);
  const name = useStudentName(id, admin) ?? teacherStudentName(me.data, id);
  const [pane, setPane] = useState<Pane>('reports');
  // Only my own lessons' reports open as a form; another teacher's stays a history line.
  // The admin reads any report (read-only, ops/AdminReportScreen).
  const who = whoOf(admin, me.data);
  const back = () => backWithin(admin ? `/students/${id}` : '/teacher/reports');
  const switcher = (
    <FilterPills
      items={panes()}
      value={pane}
      onChange={setPane}
      accessibilityLabel={t.teacherBoard.drawerTabs}
    />
  );
  return (
    <Screen>
      <ScreenHeader
        title={name}
        size="h2"
        connecting
        subtitle={t.reports.history}
        leading={<BackButton onPress={back} />}
      />
      {/* A teacher's trial student (the admin's view reads no /teachers/me, so never). */}
      <TrialChatNote status={teacherStudent(me.data, id)?.status} />
      {admin ? null : switcher}
      {pane === 'lessons' ? (
        <StudentLessonsPanel studentId={id} tz={me.data?.tz} />
      ) : (
        <ReportsPane id={id} who={who} />
      )}
    </Screen>
  );
}
