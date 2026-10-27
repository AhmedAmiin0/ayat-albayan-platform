// Test fixtures and HTTP harness for the assistant-pay module (test-only, excluded from the build by *.fakes.ts).
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppModule } from '../../../app.module';
import { AuditService } from '../../../common/audit/audit.service';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../../common/auth/auth.guard';
import type { AuthUser } from '../../../common/auth/verify-token';
import { EarningsReceipts } from '../teacher-earnings/earnings.receipts';
import { AssistantRpc } from './assistant-pay.rpc';
import { CommissionsQueries } from './commissions/commissions.queries';
import { MyQueries } from './my/my.queries';
import { StatementsQueries } from './statements/statements.queries';
import { TermsQueries } from './terms/terms.queries';

import { A, ADMIN, B } from './rows.fakes';

export { A, ADMIN, B, ID, STUDENT, statementRow } from './rows.fakes';
export const USERS: Record<string, AuthUser> = {
  admin: { id: ADMIN, email: null, role: 'admin' },
  salesA: { id: A, email: null, role: 'sales' },
  salesB: { id: B, email: null, role: 'sales' },
  teacher: { id: 'e1000000-0000-4000-8000-0000000000e1', email: null, role: 'teacher' },
  ta: { id: 'f1000000-0000-4000-8000-0000000000f1', email: null, role: 'assistant' },
  guardian: { id: 'a2000000-0000-4000-8000-0000000000a2', email: null, role: 'guardian' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};

export async function assistantApp() {
  const my = { students: vi.fn(), guardianPhones: vi.fn(), payments: vi.fn(), tz: vi.fn(), commissions: vi.fn(), adjustments: vi.fn() };
  const terms = { assistants: vi.fn(), isAssistant: vi.fn(), all: vi.fn(), get: vi.fn(), uncommissioned: vi.fn(), broughtBy: vi.fn(), renewalShare: vi.fn() };
  const statements = { list: vi.fn(), get: vi.fn() };
  const ledger = { list: vi.fn() };
  const rpc = {
    generate: vi.fn(), approve: vi.fn(), reopen: vi.fn(), pay: vi.fn(), unpay: vi.fn(),
    adjust: vi.fn(), setTerms: vi.fn(), voidCommission: vi.fn(), broughtBy: vi.fn(), evaluate: vi.fn(),
  };
  const receipts = { check: vi.fn(), uploadUrl: vi.fn(), download: vi.fn() };
  const audit = { record: vi.fn() };
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
    .overrideProvider(MyQueries).useValue(my)
    .overrideProvider(TermsQueries).useValue(terms)
    .overrideProvider(StatementsQueries).useValue(statements)
    .overrideProvider(CommissionsQueries).useValue(ledger)
    .overrideProvider(AssistantRpc).useValue(rpc)
    .overrideProvider(EarningsReceipts).useValue(receipts)
    .overrideProvider(AuditService).useValue(audit)
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const call = (input: { method: 'GET' | 'POST' | 'PUT'; url: string; token: keyof typeof USERS; body?: object }) =>
    app.inject({ method: input.method, url: input.url, headers: { authorization: `Bearer ${input.token}` }, payload: input.body });
  return { app, call, my, terms, statements, ledger, rpc, receipts, audit };
}
