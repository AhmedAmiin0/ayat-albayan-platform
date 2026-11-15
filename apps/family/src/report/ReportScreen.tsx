import { lessonWhenAt, type ClockOptions, type ReportPageView } from '@ab/shared';
import { useLocalSearchParams } from 'expo-router';
import { t } from '@ab/mobile-kit';
import { FamilyHeader, FamilyPage, LoadState } from '@/nav';
import { useFamilyClock, useReportPage } from '@/portal';
import { ReportBody } from './ReportBody';
import { ReportFiles } from './ReportFiles';

interface ReportParams {
  [key: string]: string;
  id: string;
  student: string;
}

/** «سارة · الخميس 13 نوفمبر 6:30 م» on the student's clock. */
const whoWhen = (view: ReportPageView, clock: ClockOptions): string =>
  `${view.student.name} · ${lessonWhenAt(new Date(view.lesson.starts_at), { ...clock, tz: view.tz })}`;

/**
 * «تقرير الحلقة» (docs/50 §6, canvas Report), pushed above the tabs: the content, homework and the
 * next plan, the PDF and the recording when visible. Opening it marked it seen (openReport).
 * When the content cannot be read, the PDF still opens by the portal's signed link.
 */
export function ReportScreen() {
  const params = useLocalSearchParams<ReportParams & { rec?: string }>();
  const page = useReportPage(params.id);
  const clock = useFamilyClock();
  const view = page.data;
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
