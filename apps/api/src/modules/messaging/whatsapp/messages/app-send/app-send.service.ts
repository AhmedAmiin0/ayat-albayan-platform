import { APP_SEND_MS } from '@ab/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { MessageViews } from '@/modules/messaging/whatsapp/messages/message.views';
import type { MessageChange } from '@/modules/messaging/whatsapp/messages/messages.service';
import type { ThreadMessageRow } from '@/modules/messaging/whatsapp/messages/message.mapper';
import { AppSendAdopt } from '@/modules/messaging/whatsapp/sender/window/manual-send';
import { appSendable } from './app-send.rules';
import { AppSendRepo } from './app-send.repo';
import { httpError } from '@/common/http/errors';

/** 409 not_app_send with the row as it is now: the clients word it from its status. */
const refused = (row: ThreadMessageRow) =>
  httpError(409, 'not_app_send', { status: row.status, error_code: row.error_code });

/** The tap only holds the row off for APP_SEND_MS (docs/19); the echo confirms; idempotent. */
@Injectable()
export class AppSend {
  constructor(
    private readonly repo: AppSendRepo,
    private readonly views: MessageViews,
    private readonly adopts: AppSendAdopt,
  ) {}

  async start(id: string, now = new Date()): Promise<MessageChange> {
    const before = await this.row(id);
    if (!appSendable(before) || before.error_code === null) throw refused(before);
    if (await this.adopts.adopt(before, now)) throw refused(await this.row(id));
    const until = new Date(now.getTime() + APP_SEND_MS);
    const write = { id, status: before.status, errorCode: before.error_code, until };
    const after = await this.repo.start(write);
    if (!after) throw refused(await this.row(id));
    return { before, view: await this.views.view(after) };
  }

  private async row(id: string): Promise<ThreadMessageRow> {
    const row = await this.repo.get(id);
    if (!row) throw new NotFoundException({ code: 'message_not_found', message: 'message_not_found' });
    return row;
  }
}
