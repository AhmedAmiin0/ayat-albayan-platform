import { priceListPdfBody } from '@ab/client-core';
import { DEFAULT_ROUNDING } from '@ab/money';
import { pricingRoutes } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import { call } from '@ab/web-kit';
import { saveFile } from './pdf-download.helpers';
import type { PdfDownloadProps } from './PdfDownload.types';

/** The calculator never offers rounding, so its PDF is priced like its list: nearest. */
export function usePdfDownload({ sel }: PdfDownloadProps) {
  const choice = { ...sel, rounding: DEFAULT_ROUNDING };
  const make = useMutation({
    mutationFn: () =>
      call({ route: pricingRoutes.listPdf, body: priceListPdfBody(choice, crypto.randomUUID()) }),
    onSuccess: (pdf) => saveFile(pdf.url),
  });
  return { pending: make.isPending, failed: make.isError, download: () => make.mutate() };
}
