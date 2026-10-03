import type {
  SignedDownload,
  SignedUpload,
  TeacherEarningsView,
  TeacherPaymentCreate,
  TeacherPaymentView,
  TeacherReceiptUpload,
} from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { MONEY_KEY } from '@/features/subscriptions/api';
import { apiFetch, apiSend } from '@/lib/api';
import { supabase } from '@/lib/supabase';

// apps/api per-session teacher earnings (docs/11 §8b). `me` is the teacher's own read-only view.
export type { TeacherEarningsView, TeacherEarningView, TeacherPaymentView } from '@ab/shared';

/** `owner` is a teacher id, or 'me' for the teacher portal. */
export const earningsKeys = {
  all: [...MONEY_KEY, 'teacher-earnings'] as const,
  of: (owner: string) => [...earningsKeys.all, owner] as const,
  earnings: (owner: string) => [...earningsKeys.of(owner), 'earnings'] as const,
  payments: (owner: string) => [...earningsKeys.of(owner), 'payments'] as const,
};

const base = (owner: string) => (owner === 'me' ? '/teachers/me/earnings' : `/teachers/${owner}/earnings`);

export const teacherEarningsQuery = (owner: string) =>
  queryOptions({
    queryKey: earningsKeys.earnings(owner),
    queryFn: () => apiFetch<TeacherEarningsView>(base(owner)),
  });

export const teacherPaymentsQuery = (owner: string) =>
  queryOptions({
    queryKey: earningsKeys.payments(owner),
    queryFn: () => apiFetch<TeacherPaymentView[]>(`${base(owner)}/payments`),
  });

export const createTeacherPayment = (teacherId: string, body: TeacherPaymentCreate) =>
  apiSend<TeacherPaymentView>('POST', `${base(teacherId)}/payments`, body);

export const teacherReceiptUrl = (teacherId: string, paymentId: string) =>
  apiFetch<SignedDownload>(`${base(teacherId)}/payments/${paymentId}/receipt`);

/** The receipt goes straight to the private bucket through a one-off signed URL, then its path is sent. */
export async function uploadTeacherReceipt(teacherId: string, file: File): Promise<string> {
  const body: TeacherReceiptUpload = { mime: file.type as TeacherReceiptUpload['mime'], size: file.size };
  const signed = await apiSend<SignedUpload>('POST', `${base(teacherId)}/receipt-upload-url`, body);
  const { error } = await supabase.storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
  if (error) throw error;
  return signed.path;
}
