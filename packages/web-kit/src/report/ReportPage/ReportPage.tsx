import { useQuery } from '@tanstack/react-query';
import { LanguageSwitch } from '#/components/shell/index.ts';
import { Cartouche, Logo, ListSkeleton } from '#/components/ui/index.ts';
import { t } from '#/lib/i18n/index.ts';
import { reportPageQuery } from '#/report/api.ts';
import { PublicReport } from '#/report/PublicReport.tsx';
import { ReportPageBody } from '#/report/ReportPageBody.tsx';

/**
 * /report/:publicId (owner 2026-11-06): the report's live page, without the app shell, rendered
 * from the saved report with the teacher's files and the PDF. Read with the browser's session:
 * the report's readers see it; anyone else verifies by a WhatsApp code (PublicReport).
 */
export function ReportPage({ publicId }: { publicId: string }) {
  const query = useQuery(reportPageQuery(publicId));
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
