import type { SignedDownload, SignedUpload } from '@ab/shared';
import type { PaymentMethod } from '@ab/catalog';
import type {
  AssistantStatementView,
  AssistantTermsInput,
  BroughtByInput,
  BroughtByView,
} from '@ab/money';
import { monthRangeIn } from '@ab/time';
import {
  assistantPayCalls,
  type AssistantLedgerQuery,
  type AssistantRow,
  type LedgerFilter,
  type StatementFilter,
} from '@ab/client-core';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { uploadSigned } from '@/lib/storage/upload-slot';
import { assistantPayKeys } from '@/features/people/keys';

// Reads need assistantpay.read, writes .write, approval .approve; amounts are per currency.
export type {
  AssistantCommissionView,
  AssistantStatementView,
  AssistantTermsView,
} from '@ab/money';

export const ASSISTANTS_KEY = assistantPayKeys.all;

const calls = assistantPayCalls({ apiFetch, apiSend });

/** GET /assistant-pay/terms: every assistant (base role sales) with their terms, reshaped to the list's row. */
export const assistantsQuery = queryOptions({
  queryKey: assistantPayKeys.assistants(),
  queryFn: async (): Promise<AssistantRow[]> => {
    const rows = await calls.terms();
    return rows.map(({ name, ...terms }) => ({ id: terms.assistant_id, name, terms }));
  },
});

export const saveTerms = (input: { assistantId: string; body: AssistantTermsInput }) =>
  calls.saveTerms(input.assistantId, input.body);

const qs = (params: Record<string, string>) => {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== ''));
  return q.size ? `?${q}` : '';
};

// ponytail: the ledger filters by `from`/`to` instants; a month is cut at UTC midnight (statements cut it
// in the assistant's zone), so a commission at a month's edge can show in the neighbouring month here.
export const ledgerMonthRange = (month: string): Record<string, string> => {
  if (!month) return {};
  const { from, to } = monthRangeIn(month, 'UTC');
  return { from: from.toISOString(), to: to.toISOString() };
};

/** An empty filter is left out of the query. */
const ledgerQuery = (f: LedgerFilter): AssistantLedgerQuery => ({
  assistantId: f.assistantId || undefined,
  status: f.status || undefined,
  ...ledgerMonthRange(f.month),
});

export const commissionsQuery = (f: LedgerFilter) =>
  queryOptions({
    queryKey: assistantPayKeys.commissions(f),
    queryFn: () => calls.ledger(ledgerQuery(f)),
  });

export const voidCommission = (input: { id: string; reason: string }) =>
  calls.voidCommission(input.id, input.reason);

export const statementsQuery = (f: StatementFilter) =>
  queryOptions({
    queryKey: assistantPayKeys.statements(f),
    queryFn: () => apiFetch<AssistantStatementView[]>(`/assistant-pay/statements${qs({ ...f })}`),
  });

/** Builds or rebuilds the DRAFT of one assistant's month (idempotent; a frozen one answers invalid_transition). */
export const generateStatement = (input: { assistantId: string; month: string }) =>
  apiSend<AssistantStatementView>('POST', '/assistant-pay/statements', input);

const act = (id: string, verb: string, body?: unknown) =>
  apiSend<AssistantStatementView>('POST', `/assistant-pay/statements/${id}/${verb}`, body);

export const approveStatement = (id: string) => act(id, 'approve');
export const reopenStatement = (id: string) => act(id, 'reopen');
export const unpayStatement = (input: { id: string; reason: string }) => act(input.id, 'unpay', { reason: input.reason });

export interface PayStatementBody {
  paidAt: string;
  method: PaymentMethod;
  note: string | null;
  receiptPath: string | null;
}
export const payStatement = (input: { id: string; body: PayStatementBody }) =>
  act(input.id, 'pay', input.body);

export const statementReceiptUrl = (id: string) => apiFetch<SignedDownload>(`/assistant-pay/statements/${id}/receipt`);

/** Straight to the private bucket through a one-off signed URL; the path is then sent with the pay. */
export async function uploadStatementReceipt(file: File, assistantId: string): Promise<string> {
  const signed = await apiSend<SignedUpload>('POST', '/assistant-pay/receipt-upload-url', { assistantId, mime: file.type, size: file.size });
  const { error } = await uploadSigned(signed, { body: file, contentType: file.type });
  if (error) throw error;
  return signed.path;
}

export type BroughtBy = BroughtByView;

export const broughtByQuery = (studentId: string) =>
  queryOptions({
    queryKey: assistantPayKeys.broughtBy(studentId),
    queryFn: () => calls.broughtByOf(studentId),
  });

/** One student or many (bulk); assistantId null clears it. Audited by the API. */
export const setBroughtBy = (body: BroughtByInput) => calls.setBroughtBy(body);
