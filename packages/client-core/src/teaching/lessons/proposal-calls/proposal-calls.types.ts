import type { RouteBody, RouteParams, RouteResult } from '@ab/core';
import type { lessonProposalRoutes, lessonProposeRoutes } from '@ab/schedule';

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
