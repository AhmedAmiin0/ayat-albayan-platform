import type { ReportSummaryView } from '@ab/shared';
import { type Href, router } from 'expo-router';
import { useState } from 'react';
import { useViewerTz } from '@/core/lib/clock';
import { openSigned } from '@/core/lib/http/open-signed';
import { t } from '@/core/lib/i18n/i18n';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { useStudentHref } from '@/core/nav/tree-base';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { LazyList } from '@/core/ui/lists/LazyList';
import { ReportHistoryRow, reportFormHref } from '@/core/ui/lists/ReportRows';
import { RecordingsButton } from '@/student-file';

/** Who reads: the admin (any report, read-only) or the teacher (her own lessons' forms). */
export type Who = { admin: true } | { admin: false; teacherId: string | undefined };

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

interface EmptyProps {
  loaded: boolean;
  failed: boolean;
  retry: () => void;
}

/** No report yet, or the first page failed (with a retry); nothing while it loads. */
function ReportsEmpty({ loaded, failed, retry }: EmptyProps) {
  if (loaded) return <EmptyState title={t.reports.noReports} />;
  return failed ? <ErrorState onRetry={retry} /> : null;
}

/**
 * «التقارير» of one student (R-REP-05, R-TCH-03): the recordings way (a teacher's), then every
 * sent report, newest first, with its PDF once it is ready. Only the teacher's own lessons'
 * reports open as a form; another teacher's stays a history line. The admin reads any report
 * (read-only, ops/AdminReportScreen).
 */
export function ReportsPane({ id, who }: { id: string; who: Who }) {
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
