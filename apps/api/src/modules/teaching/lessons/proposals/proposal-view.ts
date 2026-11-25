import type { LessonProposalView, ProposalRequester } from '@ab/schedule';
import type { LessonRow } from '@/modules/teaching/lessons/store/lesson-row';

/** Postgres "2026-10-04 14:00:00+00" → "2026-10-04T14:00:00.000Z". */
export const iso = (value: string): string => new Date(value).toISOString();

const REQUESTERS: Readonly<Record<string, ProposalRequester>> = { family: 'family' };

/** The stored requester; anything else (an older row, a fake without it) is the teacher's. */
const requesterOf = (value: string | undefined): ProposalRequester =>
  REQUESTERS[value ?? ''] ?? 'teacher';

/** The lesson's pending proposal (at most one, R-SCH-08), the teacher's or the family's. */
export function pendingProposal(rows: LessonRow['proposals'] | undefined): LessonProposalView | null {
  const p = rows?.find((r) => r.status === 'pending');
  if (!p) return null;
  return {
    id: p.id,
    proposed_starts_at: iso(p.proposed_starts_at),
    note: p.note,
    created_at: iso(p.created_at),
    requested_by: requesterOf(p.requested_by),
  };
}
