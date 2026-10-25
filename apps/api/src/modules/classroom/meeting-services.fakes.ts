// Real meeting services over mocked queries (unit tests only; not shipped: *.fakes.ts).
import type { PushService } from '../../common/push/push.service';
import type { TeacherScopes } from '../inbox/teacher-scope';
import type { ThreadsQueries } from '../inbox/threads.queries';
import type { MessageSender } from '../whatsapp/sender/message.sender';
import { CONFIG } from './classroom.fakes';
import { meetingQueries } from './internal-meetings.fakes';
import type { InternalMeetingsQueries } from './internal-meetings.queries';
import { InternalMeetingsService } from './internal-meetings.service';
import { LivekitApi } from './livekit/livekit-api';
import { MeetingCreateDeps, MeetingCreateService } from './meeting-create.service';
import { MeetingInviteFlow } from './meeting-invite.flow';
import { MeetingInvitePolicies } from './meeting-invite.policy';
import { MeetingInviteSender } from './meeting-invite.sender';
import type { MeetingInviteeQueries } from './meeting-invitee.queries';
import { MeetingInviteeResolver } from './meeting-invitee.resolver';
import type { MeetingInviteesQueries } from './meeting-invitees.queries';
import { meetingInviteMocks } from './meeting-invites.fakes';
import { MeetingInvitesDeps, MeetingInvitesService } from './meeting-invites.service';
import type { MeetingListQueries } from './meeting-list.queries';
import { MeetingListService } from './meeting-list.service';
import { MeetingScheduleDeps, MeetingScheduleService } from './meeting-schedule.service';
import { http } from './moderation.fakes';

export const ORIGIN = 'https://app.example.test';

/** Every meeting service, wired as Nest would, over fresh mocks. */
export function meetingServices() {
  const mq = meetingQueries();
  const m = meetingInviteMocks();
  const post = http();
  const queries = mq as unknown as InternalMeetingsQueries;
  const invitees = m.invitees as unknown as MeetingInviteesQueries;
  const picks = m.picks as unknown as MeetingInviteeQueries;
  const sender = new MeetingInviteSender(
    m.push as unknown as PushService,
    m.threads as unknown as ThreadsQueries,
    m.sender as unknown as MessageSender,
  );
  const flow = new MeetingInviteFlow(invitees, sender, ORIGIN);
  const resolver = new MeetingInviteeResolver(picks, new MeetingInvitePolicies(m.teacherScopes as unknown as TeacherScopes));
  const meetings = new InternalMeetingsService(queries, new LivekitApi(CONFIG, post), ORIGIN);
  return {
    mq,
    m,
    post,
    meetings,
    create: new MeetingCreateService(queries, new MeetingCreateDeps(resolver, flow, invitees)),
    list: new MeetingListService(queries, m.lists as unknown as MeetingListQueries),
    schedule: new MeetingScheduleService(meetings, queries, new MeetingScheduleDeps(invitees, sender, resolver)),
    invites: new MeetingInvitesService(meetings, flow, new MeetingInvitesDeps(resolver, picks, invitees)),
  };
}
export type MeetingServices = ReturnType<typeof meetingServices>;
