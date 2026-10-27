import { RIYADH_TZ, type ReportSummaryView, type TeacherMe } from '@ab/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';

import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { Button } from '@/core/ui/primitives/Button';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { LazyList } from '@/core/ui/lists/LazyList';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { useStudentName } from '@/ops/reports/use-student-name';
import { RecordingsButton } from '@/student-file/recordings/RecordingsButton';
import { useTeacherMe } from '../lib/queries';
import { openSigned } from '../report/hooks/api';
import { ReportHistoryRow, reportFormHref } from '../components/ReportRows';
import { TrialChatNote } from '../components/TrialChatNote';

const teacherStudent = (me: TeacherMe | undefined, id: string) => me?.students.find((s) => s.id === id);
const teacherStudentName = (me: TeacherMe | undefined, id: string): string => teacherStudent(me, id)?.name ?? t.reports.history;
const teacherStudentStatus = (me: TeacherMe | undefined, id: string) => teacherStudent(me, id)?.status;

/** A row's tap: the admin reads any report; a teacher opens only their own lesson's form. */
function rowPress(r: ReportSummaryView, who: 'admin' | string | undefined): (() => void) | undefined {
  if (who === 'admin') return () => router.push(`/students/reports/view/${r.id}`);
  return r.teacher.id === who ? () => router.push(reportFormHref(r.lesson_id)) : undefined;
}

const keyOf = (r: ReportSummaryView) => r.id;
const whoOf = (admin: boolean, me: TeacherMe | undefined) => (admin ? 'admin' : me?.id);

interface ReportItemProps {
  row: ReportSummaryView;
  tz: string;
  who: 'admin' | string | undefined;
  onPdfFailed: () => void;
}

/** A history row with its own stable handlers, so a re-render of the screen redraws none. */
const ReportItem = memo(function ReportItem({ row, tz, who, onPdfFailed }: ReportItemProps) {
  const onPdf = useCallback(() => void openSigned(`/reports/${row.id}/pdf`).catch(onPdfFailed), [row.id, onPdfFailed]);
  const onPress = useMemo(() => rowPress(row, who), [row, who]);
  return <ReportHistoryRow row={row} tz={tz} onPdf={onPdf} onPress={onPress} />;
});

/**
 * «سجل التقارير» of one of my students (R-REP-05, R-TCH-03): every sent report, newest first, with
 * its PDF once it is ready. The API allows only a student I teach. ponytail: no grade chart here
 * (the web has it); add it when teachers ask.
 */
export function StudentReportsScreen({ admin = false }: { admin?: boolean }) {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const me = useTeacherMe(!admin);
  const adminName = useStudentName(id, admin);
  const tz = me.data?.tz ?? RIYADH_TZ;
  const name = adminName ?? teacherStudentName(me.data, id);
  const list = usePagedList<ReportSummaryView>({ path: `/students/${id}/reports`, pageSize: 10 });
  const [error, setError] = useState(false);
  const pdfFailed = useCallback(() => setError(true), []);
  // Only my own lessons' reports open as a form; another teacher's stays a history line.
  // The admin reads any report (read-only, ops/AdminReportScreen).
  const who = whoOf(admin, me.data);
  const renderItem = useCallback(
    ({ item }: { item: ReportSummaryView }) => <ReportItem row={item} tz={tz} who={who} onPdfFailed={pdfFailed} />,
    [tz, who, pdfFailed],
  );
  const back = () => (router.canGoBack() ? router.back() : router.replace(admin ? `/students/${id}` : '/teacher/reports'));
  return (
    <Screen>
      <ScreenHeader title={name} subtitle={t.reports.history} trailing={<Button variant="ghost" label={t.common.back} onPress={back} />} />
      {/* A teacher's trial student (the admin's view reads no /teachers/me, so never). */}
      <TrialChatNote status={teacherStudentStatus(me.data, id)} />
      {admin ? null : <RecordingsButton href={`/teacher/reports/student/recordings/${id}`} />}
      {error ? <ErrorLine message={t.reports.error.pdf_not_ready} /> : null}
      <LazyList
        paged={list}
        tabBar={false}
        keyExtractor={keyOf}
        renderItem={renderItem}
        ListEmptyComponent={
          list.data ? <EmptyState title={t.reports.noReports} /> : list.isError ? <ErrorState onRetry={list.refresh} /> : null
        }
      />
    </Screen>
  );
}
