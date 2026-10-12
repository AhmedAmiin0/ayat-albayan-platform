import { z } from 'zod';
import type { JoinWindowConfig } from '../settings/public.js';
import { DEFAULT_JOIN_WINDOW, joinWindow, type JoinWindow } from './join-window.js';
import {
  MAX_MEETING_INVITEES,
  meetingDurationSchema,
  meetingInviteeInputSchema,
  type MeetingInviteResult,
  type MyMeetingInvite,
} from './meeting-invites.js';

// «اجتماع داخلي»: a standalone room for internal talks (migration 193). No lesson and no teacher: a
// title, a creator, and a link /m/<token> anyone may open with a name. Since migration 410 it may be
// scheduled (starts_at, planned_end_at) and have invitees (meeting-invites.ts); unscheduled = «الآن».

/** The default title when none is typed (also the column default). */
export const DEFAULT_MEETING_TITLE = 'اجتماع';

/** POST /meetings (meetings.write): everything is optional; no startsAt = an instant meeting. */
export const createMeetingSchema = z.object({
  title: z.string().trim().min(1).max(60).optional(),
  startsAt: z.iso.datetime({ offset: true }).optional(),
  durationMin: meetingDurationSchema.optional(),
  invitees: z.array(meetingInviteeInputSchema).max(MAX_MEETING_INVITEES).optional(),
  clientRequestId: z.uuid().optional(),
});
export type CreateMeeting = z.output<typeof createMeetingSchema>;

/** POST /meetings/:id/link: the link is shown once (only its hash is stored). */
export interface MeetingCreated {
  id: string;
  url: string;
}

/** POST /meetings: the link, and one result per invitee. `replayed` = a retried clientRequestId. */
export interface MeetingCreateResult extends MeetingCreated {
  invitees: MeetingInviteResult[];
  replayed: boolean;
}

export type MeetingState = 'open' | 'ended';

/** One row of GET /meetings: the caller's own and the ones they are invited to (admin: all). */
export interface MeetingView {
  id: string;
  title: string;
  created_by: string | null;
  created_at: string;
  ends_at: string | null;
  /** null = an instant meeting. */
  starts_at: string | null;
  planned_end_at: string | null;
  cancelled_at: string | null;
  state: MeetingState;
  /** The join window of a scheduled meeting; null for an instant one (open until «إنهاء»). */
  window: JoinWindow | null;
  /** «ادخل» is shown: open, not cancelled and (scheduled) inside its window. */
  can_join: boolean;
  invitees_count: number;
  my_invite: MyMeetingInvite | null;
  /** The caller may end, cancel, reschedule and invite (its creator, or any admin). */
  can_manage: boolean;
}

/** GET /public/meetings/:token: what the guest page shows before joining. */
export interface PublicMeetingView {
  title: string;
  state: MeetingState;
  starts_at: string | null;
  /** When a scheduled meeting's room opens (join_not_open_yet before it). */
  opens_at: string | null;
}

export interface MeetingTimes {
  ends_at: string | null;
  revoked: boolean;
  cancelled_at?: string | null | undefined;
  starts_at?: string | null | undefined;
  planned_end_at?: string | null | undefined;
}

/** A scheduled meeting's window (the lesson rules: opens N min before, closes M min after); null if instant. */
export function meetingWindow(row: MeetingTimes, now: Date, win: JoinWindowConfig = DEFAULT_JOIN_WINDOW): JoinWindow | null {
  if (!row.starts_at || !row.planned_end_at) return null;
  return joinWindow({ starts_at: row.starts_at, ends_at: row.planned_end_at }, now, win);
}

/** Ended once «إنهاء» stamped ends_at, it was cancelled or revoked, or a scheduled one's window closed. */
export function meetingState(row: MeetingTimes, now: Date, win: JoinWindowConfig = DEFAULT_JOIN_WINDOW): MeetingState {
  if (row.revoked || row.cancelled_at) return 'ended';
  if (row.ends_at !== null && Date.parse(row.ends_at) <= now.getTime()) return 'ended';
  return meetingWindow(row, now, win)?.state === 'closed' ? 'ended' : 'open';
}

/** «ادخل» now: open and, when scheduled, inside the window. */
export function canJoinMeeting(row: MeetingTimes, now: Date, win: JoinWindowConfig = DEFAULT_JOIN_WINDOW): boolean {
  if (meetingState(row, now, win) === 'ended') return false;
  const w = meetingWindow(row, now, win);
  return w === null || w.state === 'open';
}

const DAY_MS = 86_400_000;

/** null when fine; else the 400 code: starts_in_past | too_far_ahead. */
export function scheduleProblem(startsAt: string, now: Date, maxDays: number): 'starts_in_past' | 'too_far_ahead' | null {
  const t = Date.parse(startsAt);
  if (t <= now.getTime()) return 'starts_in_past';
  return t - now.getTime() > maxDays * DAY_MS ? 'too_far_ahead' : null;
}

/** planned_end_at = starts_at + duration. */
export const plannedEnd = (startsAt: string, durationMin: number): string =>
  new Date(Date.parse(startsAt) + durationMin * 60_000).toISOString();
