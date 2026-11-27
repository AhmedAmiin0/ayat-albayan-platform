import { ListSkeleton } from '@ab/web-kit/components/ui/display/skeleton';
import { FormAlert } from '@ab/web-kit/components/ui/form/FormAlert';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { CodeGate } from '@ab/web-kit/report/CodeGate';
import { ReportPageBody } from '@ab/web-kit/report/ReportPageBody';
import type { PublicReportProps } from './PublicReport.types';
import { usePublicReport } from './use-public-report';

/**
 * The page for a browser that is not one of the report's signed-in readers: this report's cookie
 * opens it; without one (401 code_required) the WhatsApp code; an unknown report says «not found».
 */
export function PublicReport({ publicId }: PublicReportProps) {
  const { page, gate } = usePublicReport({ publicId });
  return (
    <>
      {page.isPending && <ListSkeleton />}
      {page.data && <ReportPageBody view={page.data} />}
      {gate && <CodeGate publicId={publicId} onVerified={() => void page.refetch()} />}
      {page.isError && !gate && <FormAlert>{t.reportPage.notFound}</FormAlert>}
    </>
  );
}
