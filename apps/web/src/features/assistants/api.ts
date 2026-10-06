import type {
  AssistantCommissionView,
  AssistantStatementView,
  AssistantTermsInput,
  AssistantTermsView,
  BroughtByInput,
  PaymentMethod,
  PayoutStatus,
  SignedDownload,
  SignedUpload,
} from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/api';
import { supabase } from '@/lib/supabase';

// apps/api assistant-pay module (owner, 2026-10-06; the «مساعد/ة» is the base role sales). Reads need
// assistantpay.read, writes assistantpay.write, approve assistantpay.approve. Amounts are per currency.
export type { AssistantCommissionView, AssistantStatementView, AssistantTermsView } from '@ab/shared';

export const ASSISTANTS_KEY = ['assistant-pay'] as const;

/** One assistant of the list: the profile and its terms (null parts are not set yet). */
export type AssistantRow = { id: string; name: string; terms: AssistantTermsView };

export const assistantsQuery = queryOptions({
  queryKey: [...ASSISTANTS_KEY, 'assistants'],
  queryFn: () => apiFetch<AssistantRow[]>('/assistant-pay/assistants'),
});

export const saveTerms = (input: { assistantId: string; body: AssistantTermsInput }) =>
  apiSend<AssistantTermsView>('PUT', `/assistant-pay/terms/${input.assistantId}`, input.body);

export type LedgerFilter = { assistantId: string; month: string; status: '' | 'earned' | 'voided' };

const qs = (params: Record<string, string>) => {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== ''));
  return q.size ? `?${q}` : '';
};

export const commissionsQuery = (f: LedgerFilter) =>
  queryOptions({
    queryKey: [...ASSISTANTS_KEY, 'commissions', f],
    queryFn: () => apiFetch<AssistantCommissionView[]>(`/assistant-pay/commissions${qs(f)}`),
  });

export const voidCommission = (input: { id: string; reason: string }) =>
  apiSend<AssistantCommissionView>('POST', `/assistant-pay/commissions/${input.id}/void`, { reason: input.reason });

export type StatementFilter = { assistantId: string; month: string; status: '' | PayoutStatus };

export const statementsQuery = (f: StatementFilter) =>
  queryOptions({
    queryKey: [...ASSISTANTS_KEY, 'statements', f],
    queryFn: () => apiFetch<AssistantStatementView[]>(`/assistant-pay/statements${qs(f)}`),
  });

/** Builds or rebuilds the DRAFT of one assistant's month (idempotent; a frozen one answers invalid_transition). */
export const generateStatement = (input: { assistantId: string; month: string }) =>
  apiSend<AssistantStatementView>('POST', '/assistant-pay/statements', input);

const act = (id: string, verb: string, body?: unknown) =>
  apiSend<AssistantStatementView>('POST', `/assistant-pay/statements/${id}/${verb}`, body);

export const approveStatement = (id: string) => act(id, 'approve');
export const reopenStatement = (id: string) => act(id, 'reopen');
export const unpayStatement = (input: { id: string; reason: string }) => act(input.id, 'unpay', { reason: input.reason });

export type PayStatementBody = { paidAt: string; method: PaymentMethod; note: string | null; receiptPath: string | null };
export const payStatement = (input: { id: string; body: PayStatementBody }) => act(input.id, 'pay', input.body);

export const statementReceiptUrl = (id: string) => apiFetch<SignedDownload>(`/assistant-pay/statements/${id}/receipt`);

/** Straight to the private bucket through a one-off signed URL; the path is then sent with the pay. */
export async function uploadStatementReceipt(file: File): Promise<string> {
  const signed = await apiSend<SignedUpload>('POST', '/assistant-pay/receipt-upload-url', { mime: file.type, size: file.size });
  const { error } = await supabase.storage.from(signed.bucket).uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
  if (error) throw error;
  return signed.path;
}

/** Who brought a student and when (the profile's «جُلب بواسطة»). */
export type BroughtBy = { assistant: { id: string; name: string } | null; brought_at: string | null };

export const broughtByQuery = (studentId: string) =>
  queryOptions({
    queryKey: [...ASSISTANTS_KEY, 'brought-by', studentId],
    queryFn: () => apiFetch<BroughtBy>(`/assistant-pay/brought-by/${studentId}`),
  });

/** One student or many (bulk); assistantId null clears it. Audited by the API. */
export const setBroughtBy = (body: BroughtByInput) => apiSend<{ changed: number }>('POST', '/assistant-pay/brought-by', body);
