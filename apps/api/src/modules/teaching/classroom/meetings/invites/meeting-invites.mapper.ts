import {
  canJoinMeeting,
  MEETING_INVITE_CHANNELS,
  MEETING_INVITE_STATUSES,
  MEETING_INVITEE_KINDS,
  meetingState,
  meetingWindow,
  type JoinWindowConfig,
  type MeetingInviteChannel,
  type MeetingInviteeKind,
  type MeetingInviteeView,
  type MeetingInviteStatus,
  type MeetingView,
  type MyMeetingInvite,
} from '@ab/shared';
import type { AuthUser } from '../../../../../common/auth/verify-token';
import type { MeetingRow } from '../../internal-meetings/internal-meetings.queries';
import { canManageMeeting } from '../../internal-meetings/internal-meetings.token';

// Pure mapping of meetings and invitees (R-MEET-01/02): what the clients see, never a phone or a hash.

const oneOf =
  <T extends string>(all: readonly T[], fallback: T) =>
  (v: string): T =>
    all.find((x) => x === v) ?? fallback;

const asInviteKind = oneOf<MeetingInviteeKind>(MEETING_INVITEE_KINDS, 'phone');
const asInviteStatus = oneOf<MeetingInviteStatus>(MEETING_INVITE_STATUSES, 'pending');
const asInviteChannel = oneOf<MeetingInviteChannel>(MEETING_INVITE_CHANNELS, 'link');

/** The invitee columns a client may see (no phone_e164, no token_hash). */
export interface InviteeRow {
  id: string;
  kind: string;
  display_name: string;
  channel: string;
  status: string;
  error_code: string | null;
  sent_at: string | null;
}

export const toInviteeView = (r: InviteeRow): MeetingInviteeView => ({
  id: r.id,
  kind: asInviteKind(r.kind),
  display_name: r.display_name,
  channel: asInviteChannel(r.channel),
  status: asInviteStatus(r.status),
  error_code: r.error_code,
  sent_at: r.sent_at,
});

export interface ViewContext {
  user: Pick<AuthUser, 'id' | 'role'>;
  now: Date;
  win: JoinWindowConfig;
  counts: ReadonlyMap<string, number>;
  mine: ReadonlyMap<string, MyMeetingInvite>;
}

export function toMeetingView(r: MeetingRow, ctx: ViewContext): MeetingView {
  return {
    id: r.id,
    title: r.title,
    created_by: r.created_by,
    created_at: r.created_at,
    ends_at: r.ends_at,
    starts_at: r.starts_at,
    planned_end_at: r.planned_end_at,
    cancelled_at: r.cancelled_at,
    state: meetingState(r, ctx.now, ctx.win),
    window: meetingWindow(r, ctx.now, ctx.win),
    can_join: canJoinMeeting(r, ctx.now, ctx.win),
    invitees_count: ctx.counts.get(r.id) ?? 0,
    my_invite: ctx.mine.get(r.id) ?? null,
    can_manage: canManageMeeting(ctx.user, r),
  };
}

const LIST_MAX = 30;
const upcoming = (m: MeetingView) => m.starts_at !== null && m.state === 'open';

/**
 * GET /meetings order: the coming scheduled meetings first (soonest first), then everything else
 * newest first (by its time, or when it was created); one row per meeting, at most 30.
 */
export function orderMeetings(views: readonly MeetingView[]): MeetingView[] {
  const unique = [...new Map(views.map((v) => [v.id, v])).values()];
  const next = unique.filter(upcoming).sort((a, b) => Date.parse(a.starts_at ?? '') - Date.parse(b.starts_at ?? ''));
  const key = (m: MeetingView) => Date.parse(m.starts_at ?? m.created_at);
  const rest = unique.filter((m) => !upcoming(m)).sort((a, b) => key(b) - key(a));
  return [...next, ...rest].slice(0, LIST_MAX);
}
