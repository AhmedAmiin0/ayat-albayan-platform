import { CHANNEL_NOT_OPEN, type ChannelReads } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { conflict, notFound } from '@/common/http/errors';
import type { ChannelActor } from '@/modules/teaching/student-channels/channel-access';
import { ChannelEditsRepo } from '@/modules/teaching/student-channels/channel-edits.repo';
import { ChannelRepo } from '@/modules/teaching/student-channels/channel.repo';
import { ChannelReadState } from './channel-read-state';

/** A participant's view of a closed channel has no messages (ChannelService.page). */
const closed = (actor: ChannelActor): boolean => actor.mode === 'participant' && !actor.open;

/** Any participant or monitor let in; other channel's message 404; closed channel 409. */
@Injectable()
export class ChannelReadsService {
  constructor(
    @Inject(ChannelRepo) private readonly queries: ChannelRepo,
    @Inject(ChannelEditsRepo) private readonly messages: ChannelEditsRepo,
    @Inject(ChannelReadState) private readonly state: ChannelReadState,
  ) {}

  async reads(actor: ChannelActor, messageId: string): Promise<ChannelReads> {
    if (closed(actor)) throw conflict(CHANNEL_NOT_OPEN);
    const channelId = await this.queries.channelOf(actor.studentId);
    const message = await this.messages.message({ channelId, id: messageId });
    if (!message) throw notFound('message_not_found');
    const viewer = { profileId: actor.profileId, studentId: actor.studentId, channelId };
    return this.state.of(message, viewer);
  }
}
