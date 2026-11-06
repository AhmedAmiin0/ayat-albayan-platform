import { useQuery } from '@tanstack/react-query';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';
import { CodeGate } from './CodeGate';
import { needsCode, publicPageQuery } from './public-api';
import { ReportPageBody } from './ReportPageBody';

/**
 * The page for a browser that is not one of the report's signed-in readers: this report's cookie
 * opens it; without one (401 code_required) the WhatsApp code; an unknown report says «not found».
 */
export function PublicReport({ publicId }: { publicId: string }) {
  const page = useQuery(publicPageQuery(publicId));
  const gate = page.isError && needsCode(page.error);
  return (
    <>
      {page.isPending && <ListSkeleton />}
      {page.data && <ReportPageBody view={page.data} />}
      {gate && <CodeGate publicId={publicId} onVerified={() => void page.refetch()} />}
      {page.isError && !gate && <FormAlert>{t.reportPage.notFound}</FormAlert>}
    </>
  );
}
