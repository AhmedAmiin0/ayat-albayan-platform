import type { AssistantCommissionView, AssistantStatementView, AssistantTermsRow, AssistantTermsView, PayoutStatus } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

// apps/api assistant-pay (owner, 2026-10-06; web apps/web/src/features/assistants/api.ts). Reads need
// assistantpay.read, writes assistantpay.write, approve/reopen/unpay assistantpay.approve. Per currency.

/** Every query and write of this module lives under it: one invalidation re-reads all (as the web). */
export const ASSISTANTS_KEY = ['assistant-pay'] as const;

/** One salesperson of the list: the profile and its terms (null parts are not set yet). */
export type AssistantRow = { id: string; name: string; terms: AssistantTermsView };

export type LedgerFilter = { assistantId: string; month: string; status: '' | 'earned' | 'voided' };
export type StatementFilter = { assistantId: string; month: string; status: '' | PayoutStatus };

const qs = (params: Record<string, string>): string => {
  const q = Object.entries(params)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  return q ? `?${q}` : '';
};

/** The web's cut: a `YYYY-MM` month as UTC instants [from, to). */
const monthRange = (month: string): Record<string, string> => {
  if (!month) return {};
  const [y = 0, m = 1] = month.split('-').map(Number);
  return { from: `${month}-01T00:00:00.000Z`, to: new Date(Date.UTC(y, m, 1)).toISOString() };
};

/** GET /assistant-pay/commissions?assistantId&status&from&to. */
export const commissionsPath = (f: LedgerFilter): string =>
  `/assistant-pay/commissions${qs({ assistantId: f.assistantId, status: f.status, ...monthRange(f.month) })}`;

/** GET /assistant-pay/statements?assistantId&month&status. */
export const statementsPath = (f: StatementFilter): string =>
  `/assistant-pay/statements${qs({ assistantId: f.assistantId, month: f.month, status: f.status })}`;

/** GET /assistant-pay/terms: every salesperson with their terms, reshaped to the list's row. */
export const useAssistants = () =>
  useQuery({
    queryKey: [...ASSISTANTS_KEY, 'assistants'],
    queryFn: async (): Promise<AssistantRow[]> => {
      const rows = await apiFetch<AssistantTermsRow[]>('/assistant-pay/terms');
      return (Array.isArray(rows) ? rows : []).map(({ name, ...terms }) => ({ id: terms.assistant_id, name, terms }));
    },
  });

export const useCommissions = (f: LedgerFilter) =>
  useQuery({ queryKey: [...ASSISTANTS_KEY, 'commissions', f], queryFn: () => apiFetch<AssistantCommissionView[]>(commissionsPath(f)) });

export const useStatements = (f: StatementFilter) =>
  useQuery({ queryKey: [...ASSISTANTS_KEY, 'statements', f], queryFn: () => apiFetch<AssistantStatementView[]>(statementsPath(f)) });
