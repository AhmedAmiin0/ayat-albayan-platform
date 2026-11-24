import type { ChannelParticipantView, ChannelReads } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { ChannelPeopleRepo } from '@/modules/teaching/student-channels/channel-people.repo';
import type { ChannelMessageRow } from '@/modules/teaching/student-channels/channel.repo';
import {
  myMark,
  readByAll,
  toParticipants,
  toReads,
} from '@/modules/teaching/student-channels/views/reads-view';
import { ChannelMembers } from './channel-members';
import { ChannelReadsRepo } from './channel-reads.repo';

/** One channel, seen by one profile. */
export interface ChannelViewer {
  profileId: string;
  studentId: string;
  channelId: string;
}

/** A page's read state: ✓✓ on my messages, the chat's people and my own read mark. */
export interface PageReads {
  readByAll: Set<string>;
  participants: ChannelParticipantView[];
  myLastReadAt: string | null;
}

/** The viewer's messages a read tick can cover (not deleted). */
const mineOf = (rows: readonly ChannelMessageRow[], me: string): ChannelMessageRow[] =>
  rows.filter((r) => r.sender_profile_id === me && !r.deleted_at);

/** Read state against the chat's current members and their channel_reads marks. */
@Injectable()
export class ChannelReadState {
  constructor(
    @Inject(ChannelMembers) private readonly members: ChannelMembers,
    @Inject(ChannelReadsRepo) private readonly marks: ChannelReadsRepo,
    @Inject(ChannelPeopleRepo) private readonly people: ChannelPeopleRepo,
  ) {}

  /** The viewer's messages among `rows` that every other member has read. */
  async byAll(viewer: ChannelViewer, rows: readonly ChannelMessageRow[]): Promise<Set<string>> {
    const mine = mineOf(rows, viewer.profileId);
    if (mine.length === 0) return new Set<string>();
    const { members, marks } = await this.load(viewer);
    return readByAll(mine, { me: viewer.profileId, members, marks });
  }

  /** One lookup for a page: its ✓✓, the chat's people by name (me flagged) and my mark. */
  async page(viewer: ChannelViewer, rows: readonly ChannelMessageRow[]): Promise<PageReads> {
    const me = viewer.profileId;
    const { members, marks } = await this.load(viewer);
    const names = await this.people.names(members.map((m) => m.profileId));
    return {
      readByAll: readByAll(mineOf(rows, me), { me, members, marks }),
      participants: toParticipants(me, { members, names }),
      myLastReadAt: myMark(me, marks),
    };
  }

  /** Who of the chat (its sender aside) has read this message, by name and role. */
  async of(message: ChannelMessageRow, viewer: ChannelViewer): Promise<ChannelReads> {
    const { members, marks } = await this.load(viewer);
    const names = await this.people.names(members.map((m) => m.profileId));
    return toReads(message, { members, marks, names });
  }

  private async load(viewer: ChannelViewer) {
    const [members, marks] = await Promise.all([
      this.members.of(viewer.studentId),
      this.marks.marks(viewer.channelId),
    ]);
    return { members, marks };
  }
}
