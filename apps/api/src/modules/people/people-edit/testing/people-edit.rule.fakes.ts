import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppModule } from '@/app.module';
import { AuditService } from '@/common/audit/audit.service';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER } from '@/common/auth/auth.guard';
import { DB } from '@/common/db/db.module';
import { fakeSettings } from '@/common/settings/settings.fakes';
import { SettingsService } from '@/common/settings/settings.service';
import { fakeDb } from '@/common/db/testing/fake-db';
import { GuardianPhonesService } from '@/modules/people/guardians';
import { PeopleEditRepo } from '@/modules/people/people-edit/people-edit.repo';
import { StudentRecordsRepo } from '@/modules/people/people-edit/student-records.repo';
import { SalesRepo } from '@/modules/sales/sales';
import { verify } from '@/modules/sales/sales/academy/sales-academy.fakes';
import { A, NONE } from '@/modules/sales/sales/sales.fakes';

export const MY_STUDENT = '51000000-0000-4000-8000-0000000000a1';
export const MY_FAMILY = '61000000-0000-4000-8000-0000000000a1';
export const OTHER_STUDENT = '52000000-0000-4000-8000-0000000000b2';
export const OTHER_FAMILY = '62000000-0000-4000-8000-0000000000b2';
const OWN_A = { leadIds: [], guardianIds: [MY_FAMILY], studentIds: [MY_STUDENT], phones: [] };

const viewRow = (id: string) => ({
  id,
  code: 'AB-0183',
  name: 'سهيلة',
  profile_id: null,
  contact_is_self: false,
  own: null,
  guardian: { id: OTHER_FAMILY, name: 'أم سهيلة', profile_id: null, phones: [], students: [] },
});

const studentRow = (id: string) => ({
  id,
  guardian_id: OTHER_FAMILY,
  contact_is_self: false,
});

type Token = 'salesA' | 'admin';
type Method = 'GET' | 'PATCH' | 'DELETE';

/**
 * AppModule with «اشتراط التعيين» and the auto-assignment ON (SalesOwnershipRule enforces):
 * salesA owns MY_STUDENT and MY_FAMILY only. Every people read and write is a vi.fn.
 */
export async function ruleApp() {
  const sales = { ownership: vi.fn(async (id: string) => (id === A ? OWN_A : NONE)) };
  const repo = { view: vi.fn(), student: vi.fn(), children: vi.fn(), setSelf: vi.fn() };
  const records = { records: vi.fn() };
  const phones = { removeSecond: vi.fn() };
  const audit = { record: vi.fn() };
  const settings = fakeSettings({ sales_require_assignee: true, sales_auto_assign: true });
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PERMISSION_RESOLVER)
    .useValue(systemResolver)
    .overrideProvider(TOKEN_VERIFIER)
    .useValue(verify)
    .overrideProvider(DB)
    .useValue(fakeDb({}).db)
    .overrideProvider(SettingsService)
    .useValue(settings)
    .overrideProvider(SalesRepo)
    .useValue(sales)
    .overrideProvider(PeopleEditRepo)
    .useValue(repo)
    .overrideProvider(StudentRecordsRepo)
    .useValue(records)
    .overrideProvider(GuardianPhonesService)
    .useValue(phones)
    .overrideProvider(AuditService)
    .useValue(audit)
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const call = (req: { method: Method; url: string; token: Token; payload?: object }) =>
    app.inject({
      method: req.method,
      url: req.url,
      headers: { authorization: `Bearer ${req.token}` },
      ...(req.payload ? { payload: req.payload } : {}),
    });
  const reset = () => {
    vi.clearAllMocks();
    repo.view.mockImplementation(async (id: string) => viewRow(id));
    repo.student.mockImplementation(async (id: string) => studentRow(id));
    repo.children.mockResolvedValue([]);
    repo.setSelf.mockImplementation(async (id: string) => ({
      ...studentRow(id),
      contact_is_self: true,
    }));
    records.records.mockResolvedValue([]);
    phones.removeSecond.mockResolvedValue(undefined);
    audit.record.mockResolvedValue(undefined);
  };
  return { app, call, reset, repo, records, phones, audit };
}
