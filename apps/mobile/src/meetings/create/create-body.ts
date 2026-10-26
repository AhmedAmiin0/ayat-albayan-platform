import type { CreateMeeting, UpdateMeeting } from '@ab/shared';
import type { DraftInvitee } from '../invite/invitee-draft';
import { startsAtUtc, type Slot } from './schedule-time';

export interface CreateDraft {
  title: string;
  /** null = an instant meeting («الآن»). */
  slot: Slot | null;
  invitees: readonly DraftInvitee[];
  /** One per opened form: a retried tap replays the same meeting (rule 8). */
  requestId: string;
}

/** POST /meetings: only what was filled; startsAt is the viewer's wall clock as a UTC instant. */
export function createBody(draft: CreateDraft, tz: string): CreateMeeting {
  const title = draft.title.trim();
  return {
    ...(title ? { title } : {}),
    ...(draft.slot ? { startsAt: startsAtUtc(draft.slot, tz), durationMin: draft.slot.durationMin } : {}),
    ...(draft.invitees.length ? { invitees: draft.invitees.map((d) => d.input) } : {}),
    clientRequestId: draft.requestId,
  };
}

/** PATCH /meetings/:id for «غيّر الموعد»: the new start (UTC) and length. */
export const rescheduleBody = (slot: Slot, tz: string): UpdateMeeting => ({
  startsAt: startsAtUtc(slot, tz),
  durationMin: slot.durationMin,
});
