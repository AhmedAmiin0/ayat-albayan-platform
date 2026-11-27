import type { RouteBody, RouteParams, RouteResult } from '@ab/core';
import type { familyRequestRoutes, lessonProposalRoutes, lessonProposeRoutes } from '@ab/schedule';

type Routes = typeof lessonProposalRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;
type Proposal = RouteParams<Routes['approve']>;
type Propose = (typeof lessonProposeRoutes)['propose'];
type ProposeAnswer = Promise<RouteResult<Propose>>;

/** Staff answers to teacher proposals and family requests; the app keeps its query keys. */
export interface ProposalDecisionCalls {
  pending: () => Answer<'pending'>;
  approve: (proposal: Proposal, body: RouteBody<Routes['approve']>) => Answer<'approve'>;
  reject: (proposal: Proposal, body: RouteBody<Routes['reject']>) => Answer<'reject'>;
}

/** The teacher's own request for another time. */
export interface TeacherProposalCalls {
  propose: (lesson: RouteParams<Propose>, body: RouteBody<Propose>) => ProposeAnswer;
}

type Family = typeof familyRequestRoutes;
type FamilyAnswer<K extends keyof Family> = Promise<RouteResult<Family[K]>>;
type FamilyRequest = RouteParams<Family['approve']>;

/** Staff answers to a family's move request; approve is a reschedule. */
export interface FamilyRequestCalls {
  pending: () => FamilyAnswer<'pending'>;
  approve: (request: FamilyRequest, body: RouteBody<Family['approve']>) => FamilyAnswer<'approve'>;
  reject: (request: FamilyRequest, body: RouteBody<Family['reject']>) => FamilyAnswer<'reject'>;
}
