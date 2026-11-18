import type { ReportPageView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { ListSkeleton } from '@ab/web-kit/components/ui/display/skeleton';
import { FamilyCard } from '@ab/web-kit/family/layout/FamilyCard';
import { PageBody } from '@ab/web-kit/family/layout/PageBody';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { FileButtons, type PortalFile } from '@ab/web-kit/portal/report/FileButtons';
import type { OpenReport } from '@ab/web-kit/portal/report/ReportView';
import { reportLines, reportPageByIdQuery } from '@ab/web-kit/report';
import { FamilyReportBody } from './FamilyReportBody';
import { reportCards, type ReportCards } from './report-cards';
import { ReportHero } from './ReportHero';

interface Props {
  studentId: string;
  report: OpenReport;
  onBack: () => void;
}

/** The page cannot be read: the PDF still opens by the portal's own signed link. */
function Fallback({ studentId, files }: { studentId: string; files: PortalFile[] }) {
  return (
    <FamilyCard className="grid gap-3">
      <p className="text-sm text-ink-3">{t.portal.loadFailed}</p>
      <FileButtons studentId={studentId} files={files} />
    </FamilyCard>
  );
}

interface BodyProps {
  read: { view: ReportPageView; cards: ReportCards } | null;
  failed: boolean;
  files: { studentId: string; recording: PortalFile[]; pdf: PortalFile };
}

/** The cards once read; the PDF fallback when the page cannot be read; a skeleton until then. */
function Body({ read, failed, files }: BodyProps) {
  if (read) return <FamilyReportBody view={read.view} cards={read.cards} files={files} />;
  if (failed) {
    return <Fallback studentId={files.studentId} files={[files.pdf, ...files.recording]} />;
  }
  return <ListSkeleton rows={3} />;
}

/**
 * «تقرير الحلقة» in the family look (docs/50 §6, boards PortalWebReport): the same content as the
 * parents' PDF from the report's live page, as the band and the cards, with the PDF, the
 * teacher's files and the recording when staff made it visible. The staff app keeps the kit's
 * ReportView; this is the family's page only.
 */
export function FamilyReportView({ studentId, report, onBack }: Props) {
  const page = useQuery(reportPageByIdQuery(report.reportId));
  const recording: PortalFile[] = report.recordingId
    ? [{ kind: 'recordings', id: report.recordingId }]
    : [];
  const view = page.data;
  const read = view ? { view, cards: reportCards(reportLines(view.report)) } : null;
  const pdf: PortalFile = { kind: 'reports', id: report.reportId };
  return (
    <>
      <ReportHero page={read} onBack={onBack} />
      <PageBody>
        <Body read={read} failed={page.isError} files={{ studentId, recording, pdf }} />
      </PageBody>
    </>
  );
}
