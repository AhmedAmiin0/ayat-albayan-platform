import type { ThreadMediaItem } from '@ab/shared';
import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../../common/auth/decorators';
import { phoneParam } from '../threads/phone-param';
import { ThreadMediaService, type ThreadFile } from './thread-media.service';

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

  /** Inbound image / PDF messages of the last 30 days, newest first, at most 12; nothing is downloaded. */
  @Get(':phone/media')
  list(@Param('phone') raw: string): Promise<ThreadMediaItem[]> {
    return this.media.list(phoneParam(raw));
  }

  /** The file as a signed URL (downloaded from WhatsApp on first use); 410 media_expired when it is gone. */
  @Get(':phone/media/:messageId')
  file(@Param('phone') raw: string, @Param('messageId', ParseUUIDPipe) messageId: string): Promise<ThreadFile> {
    return this.media.file({ phone: phoneParam(raw), messageId });
  }
}
