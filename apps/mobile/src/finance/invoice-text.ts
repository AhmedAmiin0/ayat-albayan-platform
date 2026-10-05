import type { InvoiceView } from '@ab/shared';
import { t } from '@/lib/i18n';
import { instantDay } from '@/payments/format';

const kinds: Record<InvoiceView['kind'], string> = { package: t.finance.invoicePackage, makeup: t.finance.invoiceMakeup };

/** The students of a booking invoice, «سهيلة، محمد», or «بدون طالب». */
export const invoiceStudents = (i: Pick<InvoiceView, 'students'>): string =>
  i.students.map((s) => s.name).join(t.teachers.listSeparator) || t.mobileFinance.invoices.noStudents;

/** «باقة · رُفعت من الجهاز»: what it is and how it arrived. */
export function invoiceKind(i: Pick<InvoiceView, 'kind' | 'source'>): string {
  const m = t.mobileFinance.invoices;
  return m.summary.replace('{kind}', kinds[i.kind]).replace('{source}', i.source === 'whatsapp' ? m.sourceWhatsapp : m.sourceUpload);
}

/** The second line of a row: the day it was added, then kind and source. */
export const invoiceSubtitle = (i: InvoiceView): string => `${instantDay(i.created_at)} · ${invoiceKind(i)}`;
