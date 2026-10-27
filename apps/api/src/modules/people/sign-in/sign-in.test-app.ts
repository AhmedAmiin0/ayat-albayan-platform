// HTTP test harness of the sign-in routes (test-only). Real controller, guards, services, limits and
// code crypto on AppModule; the stores, GoTrue, the WhatsApp send and the settings are the in-memory fakes.
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../../app.module';
import { AuditService } from '../../../common/audit/audit.service';
import { fakeSettings } from '../../../common/settings/settings.fakes';
import { SettingsService } from '../../../common/settings/settings.service';
import { CodeSend } from '../../messaging/whatsapp';
import { FakeAudit, FakeCodes, FakeCodeSend, PEPPER } from './sign-in.fakes';
import { FakeAuth, FakeSubjects } from './sign-in.fakes.accounts';
import { AUTH_GATE, CODE_STORE, SIGN_IN_CONFIG, SUBJECT_STORE } from './sign-in.ports';

export async function signInApp() {
  const fakes = { codes: new FakeCodes(), send: new FakeCodeSend(), subjects: new FakeSubjects(), auth: new FakeAuth(), audit: new FakeAudit() };
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(CODE_STORE).useValue(fakes.codes)
    .overrideProvider(SUBJECT_STORE).useValue(fakes.subjects)
    .overrideProvider(AUTH_GATE).useValue(fakes.auth)
    .overrideProvider(CodeSend).useValue(fakes.send)
    .overrideProvider(AuditService).useValue(fakes.audit)
    .overrideProvider(SIGN_IN_CONFIG).useValue({ pepper: PEPPER, passwordMinLength: 8, supabaseUrl: 'http://localhost', signInKey: 'k' })
    .overrideProvider(SettingsService).useValue(fakeSettings({ family_login_enabled: true }))
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const post = (url: string, body: object, ip = '203.0.113.50') => app.inject({ method: 'POST', url, payload: body, remoteAddress: ip });
  const get = (url: string) => app.inject({ method: 'GET', url });
  return { ...fakes, app, post, get };
}
