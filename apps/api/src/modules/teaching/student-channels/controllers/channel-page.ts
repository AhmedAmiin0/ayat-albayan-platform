import { channelPageQuerySchema, type ChannelPage } from '@ab/shared';
import { parseOrThrow } from '@/common/http/http';
import type { ChannelActor } from '@/modules/teaching/student-channels/channel-access';
import type { ChannelService } from '@/modules/teaching/student-channels/channel.service';

/** GET …/messages for any resolved actor: `?before=` checked (400), then one page. */
export const pageFor = (channels: ChannelService, actor: ChannelActor, query: unknown): Promise<ChannelPage> =>
  channels.page(actor, parseOrThrow(channelPageQuerySchema, query ?? {}).before);
