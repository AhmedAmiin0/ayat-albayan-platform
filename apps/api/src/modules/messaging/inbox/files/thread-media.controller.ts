import { chatMediaRoutes as routes, type ThreadFile, type ThreadMediaItem } from '@ab/shared';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { invalidPhone } from '@/modules/messaging/inbox/threads/phone-param';
import { ThreadMediaService } from './thread-media.service';

// Admin only (inbox.media on the routes): a teacher never sees a payment proof, unlike the rest of
// /threads where a teacher reads their own families' chats. A bad id (the 400 envelope) wins over a
// bad phone (400 invalid_phone).
const idThenPhone = { paramErrors: [{ name: 'messageId' }, { name: 'phone', fail: invalidPhone }] };

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
  file(@RouteInput(idThenPhone) { params }: RouteInputOf<typeof routes.file>): Promise<ThreadFile> {
    return this.media.file(params);
  }
}
