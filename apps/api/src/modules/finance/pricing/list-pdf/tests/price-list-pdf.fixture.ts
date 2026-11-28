import type { PdfAssets } from '@/modules/reporting/report-pdf';
import type { PriceListPdfModel } from '@/modules/finance/pricing/list-pdf/price-list-pdf.types';

export const STUB_ASSETS: PdfAssets = { fontCss: '', logo: 'data:image/png;base64,AA==' };

const row = (n: number, before: string | null) => ({
  name: `باقة ${n}`,
  lessons: `${n * 4} حلقات`,
  before,
  after: `${n * 10} ر.س`,
});

/** Made-up rows: the template only lays out what the model holds. */
export function aPdfModel(discounted: boolean): PriceListPdfModel {
  const before = (n: number) => (discounted ? `${n * 12} ر.س` : null);
  return {
    country: 'السعودية',
    currency: 'ريال سعودي (ر.س)',
    issued: '2030-04-01',
    discount: discounted ? 'خصم 15% على جميع الباقات' : null,
    students: discounted ? 2 : 1,
    groups: [
      { title: 'مدة الحلقة 30 دقيقة', rows: [row(1, before(1)), row(2, before(2))] },
      { title: 'الحلقة الأسبوعية', rows: [row(3, before(3))] },
    ],
    note: 'جميع الباقات تبدأ بجلسة تجريبية.',
  };
}
