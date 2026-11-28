import type { PdfAssets } from '@/modules/reporting/report-pdf';
import { priceListPdfModel } from '@/modules/finance/pricing/list-pdf/price-list-pdf.model';
import type { PriceListPdfModel } from '@/modules/finance/pricing/list-pdf/price-list-pdf.types';
import { aPriceList } from './price-list.builder';

export const STUB_ASSETS: PdfAssets = { fontCss: '', logo: 'data:image/png;base64,AA==' };
export const STUB_CONTACT = { whatsapp: '+000 00 000 0000', site: 'example.test' };

/** The model of a made-up list: the template only lays out what the model holds. */
export function aPdfModel(discount = 0): PriceListPdfModel {
  const list = aPriceList().discounted(discount).build();
  return priceListPdfModel(list, { country: 'QA', contact: STUB_CONTACT });
}
