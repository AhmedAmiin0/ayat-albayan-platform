import { Button, FormAlert, t } from '@ab/web-kit';
import type { PdfDownloadProps } from './PdfDownload.types';
import { usePdfDownload } from './use-pdf-download';

/** The country's whole price list as the branded PDF the chat sends (docs/08 §3b). */
export function PdfDownload(props: PdfDownloadProps) {
  const pdf = usePdfDownload(props);
  return (
    <div className="grid justify-items-start gap-2">
      <Button variant="secondary" disabled={pdf.pending} onClick={pdf.download}>
        {t.pricing.pdf.download}
      </Button>
      {pdf.failed && <FormAlert>{t.pricing.pdf.failed}</FormAlert>}
    </div>
  );
}
