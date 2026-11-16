import type { ChannelReads } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { ChannelPeopleRepo } from '@/modules/teaching/student-channels/channel-people.repo';
import type { ChannelMessageRow } from '@/modules/teaching/student-channels/channel.repo';
import { readByAll, toReads } from '@/modules/teaching/student-channels/views/reads-view';
import { ChannelMembers } from './channel-members';
import { ChannelReadsRepo } from './channel-reads.repo';

/** One channel, seen by one profile. */
export interface ChannelViewer {
  profileId: string;
  studentId: string;
  channelId: string;
}

/**
 * Read state against the chat's current members (ChannelMembers) and their channel_reads marks:
 * ✓✓ on my messages, and «معلومات الرسالة» (who read one message, who not yet).
 */
@Injectable()
export class ChannelReadState {
  constructor(
    @Inject(ChannelMembers) private readonly members: ChannelMembers,
    @Inject(ChannelReadsRepo) private readonly marks: ChannelReadsRepo,
    @Inject(ChannelPeopleRepo) private readonly people: ChannelPeopleRepo,
  ) {}

  /** The viewer's messages among `rows` that every other member has read. */
  async byAll(viewer: ChannelViewer, rows: readonly ChannelMessageRow[]): Promise<Set<string>> {
    const mine = rows.filter((r) => r.sender_profile_id === viewer.profileId && !r.deleted_at);
    if (mine.length === 0) return new Set<string>();
    const [members, marks] = await Promise.all([
      this.members.of(viewer.studentId),
      this.marks.marks(viewer.channelId),
    ]);
    return readByAll(mine, { me: viewer.profileId, members, marks });
  }

  /** Who of the chat (its sender aside) has read this message, by name and role. */
  async of(message: ChannelMessageRow, viewer: ChannelViewer): Promise<ChannelReads> {
    const [members, marks] = await Promise.all([
      this.members.of(viewer.studentId),
      this.marks.marks(viewer.channelId),
    ]);
    const names = await this.people.names(members.map((m) => m.profileId));
    return toReads(message, { members, marks, names });
  }
}
