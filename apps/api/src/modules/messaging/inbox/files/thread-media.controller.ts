import type { ThreadFile } from '@ab/shared';
import { id, phoneE164 } from '@ab/core';
import type { ThreadMediaItem } from '@ab/schedule';
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@/common/auth/decorators';
import { ZodParam } from '@/common/http/zod-inputs';
import { invalidPhone, invalidUuid } from '@/modules/messaging/inbox/threads/phone-param';
import { ThreadMediaService } from './thread-media.service';

/**
 * R-MSG-06: the images and PDFs a guardian sent in a chat. Admin only (a teacher never sees a
 * payment proof), unlike the rest of /threads where a teacher reads their own families' chats.
 */
@ApiTags('inbox')
@ApiBearerAuth()
@Permissions('inbox.media')
@Controller('threads')
export class ThreadMediaController {
  constructor(private readonly media: ThreadMediaService) {}

  /**
   * Inbound image / PDF messages of the last 30 days, newest first, at most 12; nothing is
   * downloaded.
   */
  @Get(':phone/media')
  list(@ZodParam('phone', phoneE164, invalidPhone) phone: string): Promise<ThreadMediaItem[]> {
    return this.media.list(phone);
  }

  /**
   * The file as a signed URL (downloaded from WhatsApp on first use); 410 media_expired when it is
   * gone.
   */
  @Get(':phone/media/:messageId')
  file(
    @ZodParam('phone', phoneE164, invalidPhone) phone: string,
    @ZodParam('messageId', id(), invalidUuid) messageId: string,
  ): Promise<ThreadFile> {
    return this.media.file({ phone, messageId });
  }
}
