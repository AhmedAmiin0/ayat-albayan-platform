import type { RouteBody, RouteQuery, RouteResult } from '@ab/core';
import type { assistantPayRoutes } from '@ab/shared';

type Admin = typeof assistantPayRoutes;
type Answer<K extends keyof Admin> = Promise<RouteResult<Admin[K]>>;

export type AssistantLedgerQuery = RouteQuery<Admin['ledger']>;

export interface AssistantPayCalls {
  terms: () => Answer<'list'>;
  saveTerms: (assistantId: string, body: RouteBody<Admin['setTerms']>) => Answer<'setTerms'>;
  ledger: (query: AssistantLedgerQuery) => Answer<'ledger'>;
  voidCommission: (commissionId: string, reason: string) => Answer<'void'>;
  broughtByOf: (studentId: string) => Answer<'broughtByOf'>;
  setBroughtBy: (body: RouteBody<Admin['broughtBy']>) => Answer<'broughtBy'>;
}
