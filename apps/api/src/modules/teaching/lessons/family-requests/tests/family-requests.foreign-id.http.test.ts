import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { messagingRoot } from '@/common/infra/test-root';
import { FamilyRequestsModule } from '@/modules/teaching/lessons/family-requests/family-requests.module';
import { bootWith, ROLE_SALES, ROLE_USERS } from '@/common/auth/auth.fakes';
import { LESSON_ID, lessonRow, STUDENT_ID } from '@/modules/teaching/lessons/lessons.fakes';
import { ProposalDecisionService } from '@/modules/teaching/lessons/proposals/lesson-proposals.service';
import { LessonProposalRepo } from '@/modules/teaching/lessons/proposals/lesson-proposals.repo';
import { LessonStore } from '@/modules/teaching/lessons/store/lesson-store';
import { LessonViews } from '@/modules/teaching/lessons/store/lesson-views';
import { TeacherCancelRepo } from '@/modules/teaching/lessons/teacher-me/teacher-cancel.repo';

// An assistant answers only the family requests of her own students (FamilyRequestAccess).
const REQUEST = '00000000-0000-4000-8000-0000000000f7';
const OTHER_SALES = '5b000000-0000-4000-8000-0000000000a2';
const ACTIONS = ['approve', 'reject'] as const;

const m = {
  proposals: { get: vi.fn() },
  store: { get: vi.fn() },
  owners: { ownersOf: vi.fn() },
  deciding: { approve: vi.fn(), reject: vi.fn(), pendingLessonIds: vi.fn() },
  views: { one: vi.fn(), many: vi.fn() },
};
const ownedBy = (salesId: string) => new Map([[STUDENT_ID, [salesId]]]);

describe('family requests answered by an assistant (lessons.reschedule)', () => {
  let app: NestFastifyApplication;
  const post = (token: string, action: string, id = REQUEST) =>
    app.inject({
      method: 'POST',
      url: `/family-requests/${id}/${action}`,
      payload: {},
      headers: { authorization: `Bearer ${token}` },
    });
  const decided = () => [...m.deciding.approve.mock.calls, ...m.deciding.reject.mock.calls];

  beforeAll(async () => {
    const builder = Test.createTestingModule({ imports: [messagingRoot(FamilyRequestsModule)] })
      .overrideProvider(LessonProposalRepo)
      .useValue(m.proposals)
      .overrideProvider(LessonStore)
      .useValue(m.store)
      .overrideProvider(TeacherCancelRepo)
      .useValue(m.owners)
      .overrideProvider(ProposalDecisionService)
      .useValue(m.deciding)
      .overrideProvider(LessonViews)
      .useValue(m.views);
    app = await bootWith(builder, ROLE_USERS);
  }, 60_000);
  afterAll(() => app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    m.proposals.get.mockResolvedValue({ id: REQUEST, lesson_id: LESSON_ID, requested_by: 'family' });
    m.store.get.mockResolvedValue(lessonRow());
    m.owners.ownersOf.mockResolvedValue(ownedBy(OTHER_SALES));
    m.deciding.approve.mockResolvedValue(LESSON_ID);
    m.deciding.reject.mockResolvedValue(LESSON_ID);
    m.views.one.mockResolvedValue({ id: LESSON_ID });
  });

  it("another assistant's family request is 403; nothing decided or read back", async () => {
    for (const action of ACTIONS) {
      const res = await post('sales', action);
      expect([action, res.statusCode, res.json().code]).toEqual([action, 403, 'not_your_student']);
    }
    expect(decided()).toEqual([]);
    expect(m.views.one).not.toHaveBeenCalled();
    expect(m.owners.ownersOf).toHaveBeenCalledWith([STUDENT_ID]);
  });

  it("an unknown id or a teacher's proposal is 404; nothing decided", async () => {
    m.proposals.get.mockResolvedValueOnce(null);
    expect((await post('sales', 'approve')).statusCode).toBe(404);
    const teachers = { id: REQUEST, lesson_id: LESSON_ID, requested_by: 'teacher' };
    m.proposals.get.mockResolvedValueOnce(teachers);
    expect((await post('sales', 'reject')).statusCode).toBe(404);
    expect(decided()).toEqual([]);
    expect(m.store.get).not.toHaveBeenCalled();
  });

  it('her own family request is answered, she is the actor', async () => {
    m.owners.ownersOf.mockResolvedValue(ownedBy(ROLE_SALES));
    for (const action of ACTIONS) expect((await post('sales', action)).statusCode).toBe(200);
    const actor = expect.objectContaining({ id: ROLE_SALES });
    expect(m.deciding.approve).toHaveBeenCalledWith(expect.objectContaining({ actor }));
    expect(m.deciding.reject).toHaveBeenCalledWith(expect.objectContaining({ actor }));
  });

  it("the admin answers another assistant's family request", async () => {
    for (const action of ACTIONS) expect((await post('admin', action)).statusCode).toBe(200);
    expect(decided()).toHaveLength(2);
  });
});
