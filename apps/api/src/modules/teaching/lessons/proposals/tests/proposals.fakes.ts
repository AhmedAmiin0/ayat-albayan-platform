import { vi } from 'vitest';
import type { LessonAccess } from '@/modules/teaching/lessons/store/lesson-access';
import type { LessonProposalRepo } from '@/modules/teaching/lessons/proposals/lesson-proposals.repo';
import {
  LessonProposeService,
  ProposalDecisionService,
} from '@/modules/teaching/lessons/proposals/lesson-proposals.service';
import { fakeStore, LESSON_ID, lessonRow } from '@/modules/teaching/lessons/lessons.fakes';
import type { RescheduleOneService } from '@/modules/teaching/lessons/reschedule/reschedule-one.service';
import type { RequestDeclinePush } from '@/modules/teaching/lessons/proposals/request-decline.push';

export const proposals = {
  create: vi.fn(),
  get: vi.fn(),
  decide: vi.fn(),
  release: vi.fn(),
  link: vi.fn(),
  pendingLessonIds: vi.fn(),
};
export const access = { assertCanTouch: vi.fn() };
export const rescheduler = { reschedule: vi.fn() };
const declined = { notify: vi.fn() };
export const NOW = new Date('2026-10-02T10:00:00Z');
export const LATER = '2026-10-05T15:00:00.000Z';
export const PROPOSAL = {
  id: 'p1',
  lesson_id: LESSON_ID,
  proposed_starts_at: '2026-10-05 15:00:00+00',
  status: 'pending',
  note: null,
};

export const proposer = (row = lessonRow()) =>
  new LessonProposeService(
    proposals as unknown as LessonProposalRepo,
    fakeStore(row).store,
    access as unknown as LessonAccess,
  );
export const decider = new ProposalDecisionService(
  proposals as unknown as LessonProposalRepo,
  rescheduler as unknown as RescheduleOneService,
  declined as unknown as RequestDeclinePush,
);
