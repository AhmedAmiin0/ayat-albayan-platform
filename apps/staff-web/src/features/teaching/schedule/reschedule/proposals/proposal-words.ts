import { t } from '@/lib/i18n/i18n';

/** The answer box's words: the teacher's proposal, or the family's request (owner 2026-11-17). */
export interface ProposalWords {
  family: boolean;
  pending: string;
  note: string;
  reject: string;
  approved: string;
  rejected: string;
}

const P = t.lessons.proposal;

const WORDS: Readonly<Record<'teacher' | 'family', ProposalWords>> = {
  teacher: {
    family: false,
    pending: P.pending,
    note: P.note,
    reject: P.reject,
    approved: P.approved,
    rejected: P.rejected,
  },
  family: {
    family: true,
    pending: P.familyPending,
    note: P.familyNote,
    reject: P.rejectRequest,
    approved: P.requestApproved,
    rejected: P.requestRejected,
  },
};

export const proposalWords = (family: boolean): ProposalWords =>
  WORDS[family ? 'family' : 'teacher'];
