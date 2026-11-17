import { Inject, Injectable } from '@nestjs/common';
import { ar } from '@/common/infra/i18n/server-text';
import { PushService } from '@/common/push/push.service';
import { PresenceRepo } from '@/modules/people/presence';
import type { ChannelActor } from './channel-access';
import { ChannelPeopleRepo } from './channel-people.repo';
import type { ChannelMessageRow } from './channel.repo';
import { FamilyChatSettings } from './family-chat.settings';

/** The push quotes this much of the message. */
const PREVIEW = 80;

/**
 * docs/31 §2 (owner 2026-11-16 «all 4 will receive the message»): a participant's message pushes
 * kind channel_message to everyone in the chat but its sender: the student's current teacher(s),
 * the guardian and the student logins (only while family_chat_enabled is on) and the one
 * assistant in the seat (owner 2026-11-16 «… but only 1»; none while it is free). The assistant
 * writes too (owner 2026-11-16 «yes it can write also»): hers reaches the teacher(s) and the
 * family, never herself. Never an admin. Its notification rule decides bell / push
 * (PushService). No WhatsApp. Never throws (PushService swallows its own failures;
 * ChannelService catches the rest).
 */
@Injectable()
export class ChannelNotify {
  constructor(
    @Inject(ChannelPeopleRepo) private readonly people: ChannelPeopleRepo,
    @Inject(PresenceRepo) private readonly presence: PresenceRepo,
    @Inject(FamilyChatSettings) private readonly familyChat: FamilyChatSettings,
    @Inject(PushService) private readonly push: PushService,
  ) {}

  async sent(actor: ChannelActor, message: ChannelMessageRow): Promise<void> {
    if (actor.mode !== 'participant') return;
    const { studentId, profileId } = actor;
    const [members, assistant, familyOn, [student], names] = await Promise.all([
      this.presence.channelPeople(studentId),
      this.people.assistantId(studentId),
      this.familyChat.enabled(),
      this.people.students([studentId]),
      this.people.names([profileId]),
    ]);
    // A family login hears the chat only while it may open it.
    const inChat = members.filter((m) => familyOn || m.role === 'teacher');
    const ids = new Set([...inChat.map((m) => m.profile_id), ...(assistant ? [assistant] : [])]);
    ids.delete(profileId);
    await this.push.notifyProfiles({
      kind: 'channel_message',
      profileIds: [...ids],
      subject: message.id,
      vars: {
        student: student?.name ?? '',
        name: names.get(profileId) ?? ar.studentChannel.roles[actor.role],
        text: message.body.slice(0, PREVIEW),
      },
      data: { studentId },
    });
  }
}
