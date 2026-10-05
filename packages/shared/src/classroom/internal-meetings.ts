import { z } from 'zod';

// «اجتماع داخلي»: a standalone room for internal talks (migration 193). No lesson, no students, no
// teacher, no WhatsApp: a title, a creator, and a link /m/<token> anyone may open with a name.

/** The default title when none is typed (also the column default). */
export const DEFAULT_MEETING_TITLE = 'اجتماع';

/** POST /meetings (any staff login): the title is optional. */
export const createMeetingSchema = z.object({
  title: z.string().trim().min(1).max(60).optional(),
});
export type CreateMeeting = z.output<typeof createMeetingSchema>;

/** POST /meetings and POST /meetings/:id/link: the link is shown once (only its hash is stored). */
export interface MeetingCreated {
  id: string;
  url: string;
}

export type MeetingState = 'open' | 'ended';

/** One row of GET /meetings (newest first, at most 20). */
export interface MeetingView {
  id: string;
  title: string;
  created_by: string | null;
  created_at: string;
  ends_at: string | null;
  state: MeetingState;
  /** The caller may end it and issue a new link (its creator, or any admin). */
  can_manage: boolean;
}

/** GET /public/meetings/:token: what the guest page shows before joining. */
export interface PublicMeetingView {
  title: string;
  state: MeetingState;
}

/** Ended once «إنهاء» stamped ends_at (now or earlier) or the row was revoked. */
export function meetingState(row: { ends_at: string | null; revoked: boolean }, now: Date): MeetingState {
  if (row.revoked) return 'ended';
  return row.ends_at !== null && Date.parse(row.ends_at) <= now.getTime() ? 'ended' : 'open';
}
