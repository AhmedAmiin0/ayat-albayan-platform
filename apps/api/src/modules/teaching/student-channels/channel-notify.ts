import { Injectable } from '@nestjs/common';
import { PushService } from '../../../common/push/push.service';
import type { ChannelActor } from './channel-access';
import { ChannelPeopleQueries } from './channel-people.queries';
import type { ChannelMessageRow } from './channel.queries';
import { ChannelQueries } from './channel.queries';

/** The push quotes this much of the message. */
const PREVIEW = 80;

/**
 * docs/31 §2: a message from the family pushes to the student's current teacher(s) only, kind
 * channel_message (its notification rule decides bell / push, PushService). A teacher's message notifies
 * nobody; monitors never. No WhatsApp. Never throws (PushService swallows its own failures).
 */
@Injectable()
export class ChannelNotify {
  constructor(
    private readonly queries: ChannelQueries,
    private readonly people: ChannelPeopleQueries,
    private readonly push: PushService,
  ) {}

  async sent(actor: ChannelActor, message: ChannelMessageRow): Promise<void> {
    if (actor.mode !== 'participant' || actor.role === 'teacher') return;
    const profiles = await this.people.teacherProfiles(await this.queries.teacherIds(actor.studentId));
    const [student] = await this.people.students([actor.studentId]);
    await this.push.notifyProfiles({
      kind: 'channel_message',
      profileIds: profiles,
      subject: message.id,
      vars: { student: student?.name ?? '', text: message.body.slice(0, PREVIEW) },
      data: { studentId: actor.studentId },
    });
  }
}
