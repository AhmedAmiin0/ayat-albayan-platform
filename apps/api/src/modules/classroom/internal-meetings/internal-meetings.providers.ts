import { InternalMeetingsController, InternalMeetingRoutes, InternalMeetingsPublicController } from './internal-meetings.controller';
import { InternalMeetingJoinService } from './internal-meetings.join.service';
import { InternalMeetingKickService } from './internal-meetings.kick.service';
import { InternalMeetingsQueries } from './internal-meetings.queries';
import { InternalMeetingsService } from './internal-meetings.service';
import { MeetingCreateDeps, MeetingCreateService } from '../meetings/schedule/meeting-create.service';
import { MeetingInviteFlow } from '../meetings/invites/meeting-invite.flow';
import { MeetingInvitePolicies } from '../meetings/invites/meeting-invite.policy';
import { MeetingInviteSender } from '../meetings/invites/meeting-invite.sender';
import { MeetingInviteeQueries } from '../meetings/invites/meeting-invitee.queries';
import { MeetingInviteeResolver } from '../meetings/invites/meeting-invitee.resolver';
import { MeetingInviteesQueries } from '../meetings/invites/meeting-invitees.queries';
import { MeetingInvitesController } from '../meetings/invites/meeting-invites.controller';
import { MeetingInvitesDeps, MeetingInvitesService } from '../meetings/invites/meeting-invites.service';
import { MeetingListQueries } from '../meetings/schedule/meeting-list.queries';
import { MeetingListService } from '../meetings/schedule/meeting-list.service';
import { MeetingScheduleDeps, MeetingScheduleService } from '../meetings/schedule/meeting-schedule.service';

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
