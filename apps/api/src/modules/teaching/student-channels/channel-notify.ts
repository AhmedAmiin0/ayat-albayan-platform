import { Inject, Injectable } from '@nestjs/common';
import { ar } from '@/common/infra/i18n/server-text';
import { PushService } from '@/common/push/push.service';
import type { ChannelActor } from './channel-access';
import { ChannelPeopleRepo } from './channel-people.repo';
import type { ChannelMessageRow } from './channel.repo';
import { previewOf } from '@/modules/teaching/student-channels/notify/preview';
import { ChannelMembers } from '@/modules/teaching/student-channels/reads/channel-members';

/**
 * docs/31 §2 (owner 2026-11-16 «all 4 will receive the message»): a participant's message pushes
 * kind channel_message to everyone in the chat but its sender: the student's current teacher(s),
 * the guardian and the student logins (only while family_chat_enabled is on) and the one
 * assistant in the seat (owner 2026-11-16 «… but only 1»; none while it is free). The assistant
 * writes too (owner 2026-11-16 «yes it can write also»): hers reaches the teacher(s) and the
 * family, never herself. Never an admin. Its notification rule decides bell / push
 * (PushService). The recipients are ChannelMembers, the same people whose read marks make ✓✓.
 * No WhatsApp. Never throws (PushService swallows its own failures;
 * ChannelService catches the rest).
 */
@Injectable()
export class ChannelNotify {
  constructor(
    @Inject(ChannelPeopleRepo) private readonly people: ChannelPeopleRepo,
    @Inject(ChannelMembers) private readonly members: ChannelMembers,
    @Inject(PushService) private readonly push: PushService,
  ) {}

  async sent(actor: ChannelActor, message: ChannelMessageRow): Promise<void> {
    if (actor.mode !== 'participant') return;
    const { studentId, profileId } = actor;
    const [members, [student], names] = await Promise.all([
      this.members.of(studentId),
      this.people.students([studentId]),
      this.people.names([profileId]),
    ]);
    const ids = members.map((m) => m.profileId).filter((id) => id !== profileId);
    await this.push.notifyProfiles({
      kind: 'channel_message',
      profileIds: ids,
      subject: message.id,
      vars: {
        student: student?.name ?? '',
        name: names.get(profileId) ?? ar.studentChannel.roles[actor.role],
        text: previewOf(message),
      },
      data: { studentId },
    });
  }
}
