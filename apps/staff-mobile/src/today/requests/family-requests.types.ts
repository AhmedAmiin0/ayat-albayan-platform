import type { LessonView, ProposalApprove } from '@ab/schedule';

interface AnswerBodies {
  approve: { body: ProposalApprove };
  reject: { note: string };
}

export type AnswerKind = keyof AnswerBodies;

export type Answer<K extends AnswerKind = AnswerKind> = {
  [P in K]: { kind: P } & AnswerBodies[P];
}[K];

export type AnswerSenders = {
  [K in AnswerKind]: (id: string, answer: Answer<K>) => Promise<LessonView>;
};
