import type { SignedDownload } from '@ab/shared';
import type { InvoiceView } from '@ab/schedule';
import { useQuery } from '@tanstack/react-query';
import { call } from '@ab/mobile-kit';
import { invoiceKeys } from '@/core/lib/keys';

/** GET /invoices?studentId=: every booking invoice of the student, newest first (a plain list, no paging). */
export const useStudentInvoices = (studentId: string, enabled: boolean) =>
  useQuery({
    queryKey: invoiceKeys.ofStudent(studentId),
    queryFn: () => call<InvoiceView[]>({ path: `/invoices?studentId=${studentId}` }),
    enabled,
  });

/** GET /invoices/:id/download: a signed URL, asked on every tap and never cached (it expires). */
export const invoiceDownloadUrl = (invoiceId: string): Promise<string> =>
  call<SignedDownload>({ path: `/invoices/${invoiceId}/download` }).then((d) => d.url);
