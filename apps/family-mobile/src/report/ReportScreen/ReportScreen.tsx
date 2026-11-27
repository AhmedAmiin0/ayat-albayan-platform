import { t } from '@ab/mobile-kit';
import { LoadState } from '@/ui';
import { FamilyHeader, FamilyPage } from '@/nav';
import { ReportBody } from '@/report/ReportBody';
import { ReportFiles } from '@/report/ReportFiles';
import { whoWhen } from './report-screen.helpers';
import { useReportScreen } from './use-report-screen';

/** Opening it marks it seen (docs/50 §6); unreadable content still opens the PDF by signed link. */
export function ReportScreen() {
  const { params, page, clock, view } = useReportScreen();
  return (
    <FamilyPage
      header={
        <FamilyHeader
          title={t.portal.app.report.title}
          subtitle={view && whoWhen(view, clock)}
          back
        />
      }
      onRefresh={() => page.refetch()}
    >
      <LoadState query={page}>{(data) => <ReportBody view={data} />}</LoadState>
      <ReportFiles
        studentId={params.student}
        reportId={params.id}
        pdfUrl={view?.pdf?.url ?? null}
        recordingId={params.rec ?? null}
      />
    </FamilyPage>
  );
}
