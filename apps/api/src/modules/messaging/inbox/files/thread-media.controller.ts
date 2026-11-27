import { id, phoneE164 } from '@ab/core';
import { chatMediaRoutes as routes, type ThreadFile, type ThreadMediaItem } from '@ab/shared';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { ZodParam } from '@/common/http/zod-inputs';
import { invalidPhone } from '@/modules/messaging/inbox/threads/phone-param';
import { ThreadMediaService } from './thread-media.service';

// Admin only (inbox.media on the routes): a teacher never sees a payment proof, unlike the rest of
// /threads where a teacher reads their own families' chats. `messageId` comes last on purpose:
// Nest runs the later param's pipe first, so a bad id still wins over a bad phone, as it did.

@ApiBearerAuth()
@Controller()
export class ThreadMediaController {
  constructor(private readonly media: ThreadMediaService) {}

  @Route(routes.list)
  list(
    @RouteInput({ badParam: invalidPhone }) { params }: RouteInputOf<typeof routes.list>,
  ): Promise<ThreadMediaItem[]> {
    return this.media.list(params.phone);
  }

  /** WhatsApp's file is downloaded on first use; 410 media_expired when it is gone. */
  @Route(routes.file)
  file(
    @ZodParam('phone', phoneE164, invalidPhone) phone: string,
    @ZodParam('messageId', id()) messageId: string,
  ): Promise<ThreadFile> {
    return this.media.file({ phone, messageId });
  }
}
