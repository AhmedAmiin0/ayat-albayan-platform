import type { InvoiceView, SignedDownload } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/core/lib/http/api';

/** GET /invoices?studentId=: every booking invoice of the student, newest first (a plain list, no paging). */
export const useStudentInvoices = (studentId: string, enabled: boolean) =>
  useQuery({
    queryKey: ['invoices', 'student', studentId],
    queryFn: () => apiFetch<InvoiceView[]>(`/invoices?studentId=${studentId}`),
    enabled,
  });

/** GET /invoices/:id/download: a signed URL, asked on every tap and never cached (it expires). */
export const invoiceDownloadUrl = (invoiceId: string): Promise<string> =>
  apiFetch<SignedDownload>(`/invoices/${invoiceId}/download`).then((d) => d.url);
