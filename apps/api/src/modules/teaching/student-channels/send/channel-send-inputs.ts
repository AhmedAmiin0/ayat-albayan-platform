import type { ChannelPost } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { badRequest } from '@/common/http/errors';
import { ChannelEditsRepo } from '@/modules/teaching/student-channels/channel-edits.repo';
import { ChannelPeopleRepo } from '@/modules/teaching/student-channels/channel-people.repo';
import { ChannelMedia } from '@/modules/teaching/student-channels/media/channel-media.service';
import { senderName } from '@/modules/teaching/student-channels/notify/sender-name';
import {
  fileColumns,
  quoteColumns,
  type ChannelFileColumns,
  type ChannelQuoteColumns,
  type NewChannelMessage,
} from './channel-row';

type Extra = Partial<ChannelFileColumns & ChannelQuoteColumns> &
  Pick<NewChannelMessage, 'kind' | 'reply_to_id'>;

/**
 * A post's file and reply, checked against its channel: the file uploaded into this channel's
 * folder (400 attachment_path), the quoted message of this channel and not deleted (400
 * reply_not_found), snapshotted now with its sender's name.
 */
@Injectable()
export class ChannelSendInputs {
  constructor(
    @Inject(ChannelMedia) private readonly media: ChannelMedia,
    @Inject(ChannelEditsRepo) private readonly messages: ChannelEditsRepo,
    @Inject(ChannelPeopleRepo) private readonly people: ChannelPeopleRepo,
  ) {}

  async columns(channelId: string, post: ChannelPost): Promise<Extra> {
    const [file, quote] = await Promise.all([
      this.media.verified(channelId, post.attachment),
      this.quote(channelId, post.reply_to_id),
    ]);
    return { ...fileColumns(file), ...quote };
  }

  private async quote(channelId: string, id: string | undefined): Promise<Extra> {
    if (!id) return {};
    const quoted = await this.messages.message({ channelId, id });
    if (!quoted || quoted.deleted_at) throw badRequest('reply_not_found');
    const sender = quoted.sender_profile_id ?? '';
    const names = await this.people.names([sender].filter(Boolean));
    return quoteColumns(quoted, senderName(names, sender, ''));
  }
}
