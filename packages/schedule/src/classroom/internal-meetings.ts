import { clientRequestId } from '@ab/core';
import { z } from 'zod';
import { DEFAULT_JOIN_WINDOW, joinWindow, type JoinWindow, type JoinWindowConfig } from './join-window';
import { MAX_MEETING_INVITEES, meetingDurationSchema, meetingInviteeInputSchema } from './meeting-invites';
import type { MeetingState } from './meeting-rooms/meeting-views.schemas';

// Internal meeting (migration 193): no lesson or teacher; schedulable since migration 410.

/** The default title when none is typed (also the column default). */
export const DEFAULT_MEETING_TITLE = 'اجتماع';

/** POST /meetings (meetings.write): everything is optional; no startsAt = an instant meeting. */
export const createMeetingSchema = z.object({
  title: z.string().trim().min(1).max(60).optional(),
  startsAt: z.iso.datetime({ offset: true }).optional(),
  durationMin: meetingDurationSchema.optional(),
  invitees: z.array(meetingInviteeInputSchema).max(MAX_MEETING_INVITEES).optional(),
  clientRequestId: clientRequestId.optional(),
});
export type CreateMeeting = z.output<typeof createMeetingSchema>;

export interface MeetingTimes {
  ends_at: string | null;
  revoked: boolean;
  cancelled_at?: string | null | undefined;
  starts_at?: string | null | undefined;
  planned_end_at?: string | null | undefined;
}

/** A scheduled meeting's window (the lesson rules: opens N min before, closes M min after); null if instant. */
export function meetingWindow(
  row: MeetingTimes,
  now: Date,
  win: JoinWindowConfig = DEFAULT_JOIN_WINDOW,
): JoinWindow | null {
  if (!row.starts_at || !row.planned_end_at) return null;
  return joinWindow({ starts_at: row.starts_at, ends_at: row.planned_end_at }, now, win);
}

/** Ended once ends_at is stamped, cancelled or revoked, or a scheduled one's window closed. */
export function meetingState(
  row: MeetingTimes,
  now: Date,
  win: JoinWindowConfig = DEFAULT_JOIN_WINDOW,
): MeetingState {
  if (row.revoked || row.cancelled_at) return 'ended';
  if (row.ends_at !== null && Date.parse(row.ends_at) <= now.getTime()) return 'ended';
  return meetingWindow(row, now, win)?.state === 'closed' ? 'ended' : 'open';
}

/** Joinable now: open and, when scheduled, inside the window. */
export function canJoinMeeting(
  row: MeetingTimes,
  now: Date,
  win: JoinWindowConfig = DEFAULT_JOIN_WINDOW,
): boolean {
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
