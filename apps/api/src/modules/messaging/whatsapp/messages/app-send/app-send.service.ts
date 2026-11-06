import { APP_SEND_MS } from '@ab/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { MessageViews } from '@/modules/messaging/whatsapp/messages/message.views';
import type { MessageChange } from '@/modules/messaging/whatsapp/messages/messages.service';
import type { ThreadMessageRow } from '@/modules/messaging/whatsapp/messages/message.mapper';
import { waHttpError } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import { appSendable } from './app-send.rules';
import { AppSendRepo } from './app-send.repo';

/** 409 not_app_send with the row as it is now: the clients word it from its status. */
const refused = (row: ThreadMessageRow) =>
  waHttpError('not_app_send', 409, { status: row.status, error_code: row.error_code });

/**
 * «أرسل عبر واتساب» (owner 2026-11-06, docs/19): the tap only keeps the platform off the row for
 * APP_SEND_MS (app_send_until); the WhatsApp Business app's echo confirms the send (ManualEcho).
 * Nothing is marked sent here, so nothing is lost when WhatsApp never opens. A second tap
 * extends the window (idempotent).
 */
@Injectable()
export class AppSend {
  constructor(
    private readonly repo: AppSendRepo,
    private readonly views: MessageViews,
  ) {}

  async start(id: string, now = new Date()): Promise<MessageChange> {
    const before = await this.row(id);
    if (!appSendable(before) || before.error_code === null) throw refused(before);
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
