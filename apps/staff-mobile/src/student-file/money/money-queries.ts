import type { SignedDownload } from '@ab/shared';
import type { InvoiceView } from '@ab/schedule';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@ab/mobile-kit';
import { invoiceKeys } from '@/core/lib/keys';

/** GET /invoices?studentId=: the student's booking invoices, newest first, unpaged. */
export const useStudentInvoices = (studentId: string, enabled: boolean) =>
  useQuery({
    queryKey: invoiceKeys.ofStudent(studentId),
    queryFn: () => apiFetch<InvoiceView[]>(`/invoices?studentId=${studentId}`),
    enabled,
  });

/** GET /invoices/:id/download: a signed URL, asked on every tap and never cached (it expires). */
export const invoiceDownloadUrl = (invoiceId: string): Promise<string> =>
  apiFetch<SignedDownload>(`/invoices/${invoiceId}/download`).then((d) => d.url);
