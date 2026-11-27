import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { messagingRoot } from '@/common/infra/test-root';
import { FamilyRequestsModule } from '@/modules/teaching/lessons/family-requests/family-requests.module';
import { bootWith, ROLE_USERS } from '@/common/auth/auth.fakes';
import { ProposalDecisionService } from '@/modules/teaching/lessons/proposals/lesson-proposals.service';
import { LessonViews } from '@/modules/teaching/lessons/store/lesson-views';

const ID = '00000000-0000-4000-8000-0000000000f7';
const asked = {
  id: ID,
  proposed_starts_at: '2026-11-18T15:30:00.000Z',
  note: null,
  created_at: '2026-11-16T10:00:00.000Z',
  requested_by: 'family',
};
const waiting = (id: string) => ({
  id,
  starts_at: '2026-11-17T15:30:00.000Z',
  ends_at: '2026-11-17T16:15:00.000Z',
  status: 'scheduled',
  teacher: { id: ID, display_name_ar: 'فاطمة', display_name_en: null, tz: 'Africa/Cairo' },
  students: [{ id: ID, code: 'AB-0147', name: 'يوسف', tz: 'Africa/Cairo' }],
  pending_proposal: asked,
});

const m = {
  deciding: { approve: vi.fn(), reject: vi.fn(), pendingLessonIds: vi.fn() },
  views: { one: vi.fn(), many: vi.fn() },
};

describe('family request route objects (R-SCH-08)', () => {
  let app: NestFastifyApplication;
  const headers = { authorization: 'Bearer admin' };
  const call = (method: 'GET' | 'POST', url: string) =>
    app.inject({ method, url, headers, payload: method === 'POST' ? {} : undefined });

  beforeAll(async () => {
    const builder = Test.createTestingModule({ imports: [messagingRoot(FamilyRequestsModule)] })
      .overrideProvider(ProposalDecisionService)
      .useValue(m.deciding)
      .overrideProvider(LessonViews)
      .useValue(m.views);
    app = await bootWith(builder, ROLE_USERS);
  }, 60_000);
  afterAll(() => app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    m.deciding.pendingLessonIds.mockResolvedValue([ID]);
  });

  it.each(['approve', 'reject'])(
    '%s of a non-uuid id answers 400 and decides nothing',
    async (a) => {
      const res = await call('POST', `/family-requests/p1/${a}`);
      expect([res.statusCode, res.json().message]).toEqual([400, 'validation_failed']);
      expect([...m.deciding.approve.mock.calls, ...m.deciding.reject.mock.calls]).toEqual([]);
    },
  );

  it('answers the waiting rows to the admin', async () => {
    m.views.many.mockResolvedValue([waiting(ID)]);
    const res = await call('GET', '/family-requests');
    expect([res.statusCode, res.json()[0].lesson_id]).toEqual([200, ID]);
  });

  it('a waiting row whose lesson id is not a uuid answers 500 response_invalid', async () => {
    m.views.many.mockResolvedValue([waiting('l1')]);
    const res = await call('GET', '/family-requests');
    expect([res.statusCode, res.json().message]).toEqual([500, 'response_invalid']);
  });
});
