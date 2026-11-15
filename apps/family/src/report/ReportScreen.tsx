import { lessonWhenAt } from '@ab/shared';
import { useLocalSearchParams } from 'expo-router';
import { AppText, SkeletonCard, t, type, useTheme } from '@ab/mobile-kit';
import { FamilyHeader, FamilyPage } from '@/nav';
import { useFamilyClock, useReportPage } from '@/portal';
import { ReportBody } from './ReportBody';
import { ReportFiles } from './ReportFiles';

type ReportParams = { id: string; student: string; rec?: string };

/**
 * «تقرير الحلقة» (docs/50 §6, canvas Report), pushed above the tabs: the content, homework and the
 * next plan, the PDF and the recording when visible. Opening it marked it seen (openReport).
 * When the content cannot be read, the PDF still opens by the portal's signed link.
 */
export function ReportScreen() {
  const { color } = useTheme();
  const { id, student, rec } = useLocalSearchParams<ReportParams>();
  const page = useReportPage(id);
  const clock = useFamilyClock();
  const view = page.data;
  const at = view && lessonWhenAt(new Date(view.lesson.starts_at), { ...clock, tz: view.tz });
  const when = view && at ? `${view.student.name} · ${at}` : undefined;
  return (
    <FamilyPage
      header={<FamilyHeader title={t.portal.app.report.title} subtitle={when} back />}
      onRefresh={() => page.refetch()}
    >
      {view ? <ReportBody view={view} /> : null}
      {page.isPending ? <SkeletonCard /> : null}
      {page.isError ? (
        <AppText style={{ fontSize: type.size.sm, color: color.ink3 }}>
          {t.portal.loadFailed}
        </AppText>
      ) : null}
      <ReportFiles
        studentId={student}
        reportId={id}
        pdfUrl={view?.pdf?.url ?? null}
        recordingId={rec ?? null}
      />
    </FamilyPage>
  );
}
