import { InternalMeetingsController, InternalMeetingRoutes, InternalMeetingsPublicController } from './internal-meetings.controller';
import { InternalMeetingJoinService } from './internal-meetings.join.service';
import { InternalMeetingKickService } from './internal-meetings.kick.service';
import { InternalMeetingsQueries } from './internal-meetings.queries';
import { InternalMeetingsService } from './internal-meetings.service';
import { MeetingCreateDeps, MeetingCreateService } from './meeting-create.service';
import { MeetingInviteFlow } from './meeting-invite.flow';
import { MeetingInvitePolicies } from './meeting-invite.policy';
import { MeetingInviteSender } from './meeting-invite.sender';
import { MeetingInviteeQueries } from './meeting-invitee.queries';
import { MeetingInviteeResolver } from './meeting-invitee.resolver';
import { MeetingInviteesQueries } from './meeting-invitees.queries';
import { MeetingInvitesController } from './meeting-invites.controller';
import { MeetingInvitesDeps, MeetingInvitesService } from './meeting-invites.service';
import { MeetingListQueries } from './meeting-list.queries';
import { MeetingListService } from './meeting-list.service';
import { MeetingScheduleDeps, MeetingScheduleService } from './meeting-schedule.service';

// «اجتماع داخلي» (migration 193) with scheduling and invitations (R-MEET-01..03, migrations 410–414):
// listed here so ClassroomModule stays readable. ThreadsQueries and TeacherScopes (InboxModule), PushService (global)
// and MessageSender (global WhatsappModule) come from outside.

export const INTERNAL_MEETING_CONTROLLERS = [InternalMeetingsController, InternalMeetingsPublicController, MeetingInvitesController];

export const INTERNAL_MEETING_PROVIDERS = [
  InternalMeetingsQueries,
  InternalMeetingsService,
  InternalMeetingJoinService,
  InternalMeetingKickService,
  InternalMeetingRoutes,
  MeetingListQueries,
  MeetingListService,
  MeetingCreateDeps,
  MeetingCreateService,
  MeetingInviteeQueries,
  MeetingInviteeResolver,
  MeetingInviteesQueries,
  MeetingInviteSender,
  MeetingInviteFlow,
  MeetingInvitePolicies,
  MeetingInvitesDeps,
  MeetingInvitesService,
  MeetingScheduleDeps,
  MeetingScheduleService,
];
