import { InternalMeetingsController, InternalMeetingRoutes, InternalMeetingsPublicController } from './internal-meetings.controller';
import { InternalMeetingJoinService } from './internal-meetings.join.service';
import { InternalMeetingKickService } from './internal-meetings.kick.service';
import { InternalMeetingsRepo } from './internal-meetings.repo';
import { InternalMeetingsService } from './internal-meetings.service';
import { MeetingCreateDeps, MeetingCreateService } from '@/modules/teaching/classroom/meetings/schedule/meeting-create.service';
import { MeetingInviteFlow } from '@/modules/teaching/classroom/meetings/invites/meeting-invite.flow';
import { MeetingInvitePolicies } from '@/modules/teaching/classroom/meetings/invites/meeting-invite.policy';
import { MeetingInviteSender } from '@/modules/teaching/classroom/meetings/invites/meeting-invite.sender';
import { MeetingInviteeRepo } from '@/modules/teaching/classroom/meetings/invites/meeting-invitee.repo';
import { MeetingInviteeResolver } from '@/modules/teaching/classroom/meetings/invites/meeting-invitee.resolver';
import { MeetingInviteesRepo } from '@/modules/teaching/classroom/meetings/invites/meeting-invitees.repo';
import { MeetingInvitesController } from '@/modules/teaching/classroom/meetings/invites/meeting-invites.controller';
import { MeetingInvitesDeps, MeetingInvitesService } from '@/modules/teaching/classroom/meetings/invites/meeting-invites.service';
import { MeetingListRepo } from '@/modules/teaching/classroom/meetings/schedule/meeting-list.repo';
import { MeetingListService } from '@/modules/teaching/classroom/meetings/schedule/meeting-list.service';
import { MeetingScheduleDeps, MeetingScheduleService } from '@/modules/teaching/classroom/meetings/schedule/meeting-schedule.service';

// «اجتماع داخلي» (migration 193) with scheduling and invitations (R-MEET-01..03, migrations 410–414):
// listed here so ClassroomModule stays readable. ThreadsQueries and TeacherScopes (InboxModule), PushService (global)
// and MessageSender (global WhatsappModule) come from outside.

export const INTERNAL_MEETING_CONTROLLERS = [InternalMeetingsController, InternalMeetingsPublicController, MeetingInvitesController];

export const INTERNAL_MEETING_PROVIDERS = [
  InternalMeetingsRepo,
  InternalMeetingsService,
  InternalMeetingJoinService,
  InternalMeetingKickService,
  InternalMeetingRoutes,
  MeetingListRepo,
  MeetingListService,
  MeetingCreateDeps,
  MeetingCreateService,
  MeetingInviteeRepo,
  MeetingInviteeResolver,
  MeetingInviteesRepo,
  MeetingInviteSender,
  MeetingInviteFlow,
  MeetingInvitePolicies,
  MeetingInvitesDeps,
  MeetingInvitesService,
  MeetingScheduleDeps,
  MeetingScheduleService,
];
