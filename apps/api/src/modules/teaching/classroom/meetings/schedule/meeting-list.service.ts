import type { MeetingView, MyMeetingInvite } from '@ab/schedule';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { InternalMeetingsRepo } from '@/modules/teaching/classroom/internal-meetings/internal-meetings.repo';
import { MeetingListRepo } from './meeting-list.repo';
import { orderMeetings, toMeetingView } from '@/modules/teaching/classroom/meetings/invites/meeting-invites.mapper';

const DAY_MS = 86_400_000;

/** GET /meetings (R-MEET-01): coming scheduled ones soonest first, then the rest newest first. */
@Injectable()
export class MeetingListService {
  constructor(
    private readonly queries: InternalMeetingsRepo,
    private readonly lists: MeetingListRepo,
  ) {}

  async list(user: AuthUser, now = new Date()): Promise<MeetingView[]> {
    const createdBy = user.role === 'admin' ? null : user.id;
    const since = new Date(now.getTime() - DAY_MS).toISOString();
    const [latest, upcoming, invites, win] = await Promise.all([
      this.lists.latest(createdBy),
      this.lists.upcoming({ createdBy, since }),
      this.lists.myInvites(user.id),
      this.queries.joinWindow(),
    ]);
    const invited = await this.lists.byIds(invites.map((i) => i.meeting_id));
    const rows = [...latest, ...upcoming, ...invited];
    const counts = await this.lists.counts([...new Set(rows.map((r) => r.id))]);
    const mine = new Map<string, MyMeetingInvite>(
      invites.map((i) => [i.meeting_id, { status: i.status, channel: i.channel }]),
    );
    return orderMeetings(rows.map((r) => toMeetingView(r, { user, now, win, counts, mine })));
  }
}
