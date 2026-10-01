// HTTP test harness for the leads + job-applicants controllers (test-only).
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { AuditService } from '../../common/audit/audit.service';
import { TOKEN_VERIFIER, type TokenVerifier } from '../../common/auth/auth.guard';
import type { AuthUser } from '../../common/auth/verify-token';
import { JobApplicantsModule } from '../job-applicants/job-applicants.module';
import { JobApplicantsQueries } from '../job-applicants/job-applicants.queries';
import { fakeDeps } from './leads.fakes';
import { LeadsModule } from './leads.module';
import { LeadsQueries } from './leads.queries';

const USERS: Record<string, AuthUser> = {
  admin: { id: 'admin-1', email: 'admin@x.com', role: 'admin' },
  teacher: { id: 'teacher-1', email: 't@x.com', role: 'teacher' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};

export interface InjectArgs {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  url: string;
  token?: 'admin' | 'teacher';
  body?: Record<string, unknown>;
}

/** Boots AppModule + both modules with fake queries/audit; `call` defaults to the admin token. */
export async function testApp() {
  const deps = fakeDeps();
  const mod = await Test.createTestingModule({ imports: [AppModule, LeadsModule, JobApplicantsModule] })
    .overrideProvider(TOKEN_VERIFIER)
    .useValue(verify)
    .overrideProvider(LeadsQueries)
    .useValue(deps.leads)
    .overrideProvider(JobApplicantsQueries)
    .useValue(deps.applicants)
    .overrideProvider(AuditService)
    .useValue(deps.audit)
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const call = ({ method, url, token = 'admin', body }: InjectArgs) =>
    app.inject({ method, url, headers: { authorization: `Bearer ${token}` }, payload: body });
  return { ...deps, app, call };
}
