import { APP_SEND_MS } from '@ab/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { MessageViews } from '@/modules/messaging/whatsapp/messages/message.views';
import type { MessageChange } from '@/modules/messaging/whatsapp/messages/messages.service';
import type { ThreadMessageRow } from '@/modules/messaging/whatsapp/messages/message.mapper';
import { waHttpError } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import { AppSendAdopt } from '@/modules/messaging/whatsapp/sender/window/manual-send';
import { appSendable } from './app-send.rules';
import { AppSendRepo } from './app-send.repo';

/** 409 not_app_send with the row as it is now: the clients word it from its status. */
const refused = (row: ThreadMessageRow) =>
  waHttpError('not_app_send', 409, { status: row.status, error_code: row.error_code });

/**
 * «أرسل عبر واتساب» (owner 2026-11-06, docs/19): the tap only keeps the platform off the row for
 * APP_SEND_MS (app_send_until); the WhatsApp Business app's echo confirms the send (ManualEcho).
 * Nothing is marked sent here, so nothing is lost when WhatsApp never opens. A second tap
 * extends the window (idempotent). Staff who sent the text from the app BEFORE tapping: its
 * message (stored as an external row) is adopted by the held row first (one bubble, its reopen
 * cancelled as on an attach) and the tap answers 409 with the row now sent.
 */
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
