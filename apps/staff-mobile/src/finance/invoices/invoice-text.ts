import type { InvoiceView } from '@ab/shared';
import { t } from '@ab/mobile-kit';
import { instantDay } from '@/core/lib/money/format';

const kinds: Record<InvoiceView['kind'], string> = { package: t.finance.invoicePackage, makeup: t.finance.invoiceMakeup };

export const invoiceStudents = (i: Pick<InvoiceView, 'students'>): string =>
  i.students.map((s) => s.name).join(t.common.listSeparator) || t.mobileFinance.invoices.noStudents;

export function invoiceKind(i: Pick<InvoiceView, 'kind' | 'source'>): string {
  const m = t.mobileFinance.invoices;
  return m.summary.replace('{kind}', kinds[i.kind]).replace('{source}', i.source === 'whatsapp' ? m.sourceWhatsapp : m.sourceUpload);
}

/** The second line of a row: the day it was added (the viewer's `tz`), then kind and source. */
export const invoiceSubtitle = (i: InvoiceView, tz: string): string =>
  `${instantDay(i.created_at, tz)} · ${invoiceKind(i)}`;
