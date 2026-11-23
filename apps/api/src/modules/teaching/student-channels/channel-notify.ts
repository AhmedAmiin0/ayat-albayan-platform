import { Inject, Injectable } from '@nestjs/common';
import { ar } from '@/common/infra/i18n/server-text';
import { PushService } from '@/common/push/push.service';
import type { ChannelActor } from './channel-access';
import { ChannelPeopleRepo } from './channel-people.repo';
import type { ChannelMessageRow } from './channel.repo';
import { previewOf } from '@/modules/teaching/student-channels/notify/preview';
import { senderName } from '@/modules/teaching/student-channels/notify/sender-name';
import {
  ChannelMembers,
  type ChannelMember,
} from '@/modules/teaching/student-channels/reads/channel-members';
import { TeacherChatSettings } from './family-chat.settings';

/** Everyone in the chat but the sender; a teacher only while the teacher's page is on. */
const hears = (m: ChannelMember, ctx: { sender: string; teachersOn: boolean }): boolean =>
  m.profileId !== ctx.sender && (ctx.teachersOn || m.role !== 'teacher');

/**
 * docs/31 §2 (owner 2026-11-16 «all 4 will receive the message»): a participant's message pushes
 * kind channel_message to everyone in the chat but its sender: the student's current teacher(s),
 * the guardian and the student logins (only while family_chat_enabled is on) and the one
 * assistant in the seat (owner 2026-11-16 «… but only 1»; none while it is free). The assistant
 * writes too (owner 2026-11-16 «yes it can write also»): hers reaches the teacher(s) and the
 * family, never herself. The teachers only while teacher_student_messages_enabled shows them
 * the chat (no push, no bell row while it is off). Never an admin. Its notification rule decides
 * bell / push (PushService). The recipients are ChannelMembers, the same people whose read marks
 * make ✓✓. No WhatsApp. Never throws (PushService swallows its own failures; ChannelSender
 * catches the rest, off the request path).
 */
@Injectable()
export class ChannelNotify {
  constructor(
    @Inject(ChannelPeopleRepo) private readonly people: ChannelPeopleRepo,
    @Inject(ChannelMembers) private readonly members: ChannelMembers,
    @Inject(PushService) private readonly push: PushService,
    @Inject(TeacherChatSettings) private readonly teacherChat: TeacherChatSettings,
  ) {}

  async sent(actor: ChannelActor, message: ChannelMessageRow): Promise<void> {
    if (actor.mode !== 'participant') return;
    const { studentId, profileId } = actor;
    const [members, [student], names, teachersOn] = await Promise.all([
      this.members.of(studentId),
      this.people.students([studentId]),
      this.people.names([profileId]),
      this.teacherChat.enabled(),
    ]);
    const told = members.filter((m) => hears(m, { sender: profileId, teachersOn }));
    const ids = told.map((m) => m.profileId);
    await this.push.notifyProfiles({
      kind: 'channel_message',
      profileIds: ids,
      subject: message.id,
      vars: {
        student: student?.name ?? '',
        name: senderName(names, profileId, ar.studentChannel.roles[actor.role]),
        text: previewOf(message),
      },
      data: { studentId },
    });
  }
}
