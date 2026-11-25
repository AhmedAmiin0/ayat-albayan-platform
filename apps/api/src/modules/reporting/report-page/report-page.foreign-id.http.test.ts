import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { messagingRoot } from '@/common/infra/test-root';
import { SignInModule } from '@/modules/people/sign-in';
import { ReportPageModule } from './report-page.module';
import {
  PERMISSION_RESOLVER,
  systemResolver,
  TOKEN_VERIFIER,
  type TokenVerifier,
} from '@/common/auth/auth.guard';
import type { AuthUser } from '@/common/auth/verify-token';
import { StorageService } from '@/common/storage/storage.service';
import { pageFacts, pageRow, PUBLIC_ID, user } from './report-page.fakes';
import { ReportPageRepo } from './report-page.repo';

const USERS: Record<string, AuthUser> = {
  admin: user('admin'),
  teacher: user('teacher', 'another-teacher-profile'),
  guardian: user('guardian', 'another-guardian-profile'),
  student: user('student', 'another-student-profile'),
  sales: user('sales', 'another-sales-profile'),
  assistant: user('assistant', 'another-assistant-profile'),
};
const verify: TokenVerifier = async (token) => {
  const found = USERS[token];
  if (!found) throw new Error('bad token');
  return found;
};
const SCOPED = ['teacher', 'guardian', 'student', 'sales', 'assistant'] as const;

describe("GET /report-pages/:publicId: another family's report is 404 for a scoped login", () => {
  const repo = { report: vi.fn(), facts: vi.fn(), owns: vi.fn() };
  const storage = { signedDownloads: vi.fn(), signedDownload: vi.fn() };
  let app: NestFastifyApplication;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [messagingRoot(ReportPageModule, SignInModule)],
    })
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver)
      .overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(ReportPageRepo).useValue(repo)
      .overrideProvider(StorageService).useValue(storage)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    repo.report.mockResolvedValue(pageRow());
    repo.facts.mockResolvedValue(pageFacts());
    repo.owns.mockResolvedValue(false);
    storage.signedDownloads.mockResolvedValue(new Map());
    storage.signedDownload.mockResolvedValue({ url: 'https://files.example/r.pdf', expires_at: '' });
  });
  const open = (token: string) =>
    app.inject({
      method: 'GET',
      url: `/report-pages/${PUBLIC_ID}`,
      headers: { authorization: `Bearer ${token}` },
    });

  it.each(SCOPED)("a %s who is not the report's reader gets 404, nothing signed", async (role) => {
    const res = await open(role);
    expect(res.statusCode).toBe(404);
    expect(res.json().code).toBe('report_not_found');
    expect(storage.signedDownloads).not.toHaveBeenCalled();
    expect(storage.signedDownload).not.toHaveBeenCalled();
  });

  it('a salesperson is asked about her own ownership of that student only', async () => {
    await open('sales');
    expect(repo.owns).toHaveBeenCalledWith('another-sales-profile', pageRow().student_id);
  });

  it('an unknown public id is 404 for any scoped login', async () => {
    repo.report.mockResolvedValue(null);
    for (const role of SCOPED) expect((await open(role)).statusCode).toBe(404);
    expect(repo.facts).not.toHaveBeenCalled();
    expect(storage.signedDownload).not.toHaveBeenCalled();
  });

  it('an admin still reads the page', async () => {
    expect((await open('admin')).statusCode).toBe(200);
  });
});
