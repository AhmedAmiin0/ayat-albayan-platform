// HTTP test harness for /pricing (test-only): real AppModule, fake auth, fake FX source and DB.
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { TOKEN_VERIFIER, type TokenVerifier } from '../../common/auth/auth.guard';
import type { AuthUser } from '../../common/auth/verify-token';
import { fakeFx } from '../fx/fx.fakes';
import { FX_FETCHER } from '../fx/fx.fetcher';
import { FxQueries } from '../fx/fx.queries';

const USERS: Record<string, AuthUser> = {
  admin: { id: 'admin-1', email: 'admin@x.com', role: 'admin' },
  teacher: { id: 'teacher-1', email: 't@x.com', role: 'teacher' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};

export async function pricingApp() {
  const fx = fakeFx();
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(TOKEN_VERIFIER)
    .useValue(verify)
    .overrideProvider(FX_FETCHER)
    .useValue(fx.fetcher)
    .overrideProvider(FxQueries)
    .useValue(fx.queries)
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const get = (url: string, token: 'admin' | 'teacher' = 'admin') =>
    app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` } });
  return { app, fetcher: fx.fetcher, queries: fx.queries, get };
}
