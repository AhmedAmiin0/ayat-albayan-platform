import { LanguageSwitch } from '@ab/web-kit/components/shell/LanguageSwitch';
import { Cartouche } from '@ab/web-kit/components/ui/display/cartouche';
import { Logo } from '@ab/web-kit/components/ui/display/mark';
import { ListSkeleton } from '@ab/web-kit/components/ui/display/skeleton';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { PublicReport } from '@ab/web-kit/report/PublicReport';
import { ReportPageBody } from '@ab/web-kit/report/ReportPageBody';
import type { ReportPageProps } from './ReportPage.types';
import { useReportPage } from './use-report-page';

/**
 * /report/:publicId: the report's live page, without the app shell, rendered
 * from the saved report with the teacher's files and the PDF. Read with the browser's session:
 * the report's readers see it; anyone else verifies by a WhatsApp code (PublicReport).
 */
export function ReportPage({ publicId }: ReportPageProps) {
  const { query } = useReportPage({ publicId });
  return (
    <main className="min-h-screen bg-page px-4 py-6 sm:py-10">
      <div className="mx-auto grid w-full max-w-3xl gap-5">
        <div className="flex items-center justify-between gap-3">
          <Logo />
          <LanguageSwitch />
        </div>
        <Cartouche>{t.reportPage.title}</Cartouche>
        {query.isPending && <ListSkeleton />}
        {query.isError && <PublicReport publicId={publicId} />}
        {query.data && <ReportPageBody view={query.data} />}
      </div>
    </main>
  );
}
