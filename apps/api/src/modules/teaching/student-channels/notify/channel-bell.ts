import { Inject, Injectable, Logger } from '@nestjs/common';
import { ar } from '@/common/infra/i18n/server-text';
import { pushText } from '@/common/push/expo/expo-push';
import { ChannelPeopleRepo } from '@/modules/teaching/student-channels/channel-people.repo';
import type { ChannelMessageRow } from '@/modules/teaching/student-channels/channel.repo';
import { roleOf } from '@/modules/teaching/student-channels/views/message-view';
import { ChannelBellRepo } from './channel-bell.repo';
import { previewOf } from './preview';
import { senderName } from './sender-name';

/**
 * An edit or a delete for everyone reaches the bell too: the recipients' rows of the message
 * show the new text, or «تم حذف هذه الرسالة», never the old text. A push already shown on a
 * lock screen cannot be recalled. Never throws (the change is done; a failure logs).
 */
@Injectable()
export class ChannelBell {
  private readonly log = new Logger(ChannelBell.name);

  constructor(
    @Inject(ChannelBellRepo) private readonly rows: ChannelBellRepo,
    @Inject(ChannelPeopleRepo) private readonly people: ChannelPeopleRepo,
  ) {}

  async changed(row: ChannelMessageRow): Promise<void> {
    try {
      const sender = row.sender_profile_id;
      const names = await this.people.names(sender ? [sender] : []);
      const role = ar.studentChannel.roles[roleOf(row.sender_role)];
      const name = senderName(names, sender ?? '', role);
      const text = row.deleted_at ? ar.studentChannel.actions.deleted : previewOf(row);
      const { body } = pushText('channel_message', { name, text, student: '' });
      await this.rows.rewrite({ messageId: row.id, body });
    } catch (e) {
      this.log.warn(`channel bell rewrite failed: ${String(e)}`);
    }
  }
}
