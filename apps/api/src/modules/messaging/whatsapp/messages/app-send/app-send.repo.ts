import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import {
  MESSAGE_SELECT,
  type ThreadMessageRow,
} from '@/modules/messaging/whatsapp/messages/message.mapper';

/** The tap's write: the row, the state it was read in (compare-and-set), the window's end. */
export interface AppSendWrite {
  id: string;
  status: ThreadMessageRow['status'];
  errorCode: string;
  until: Date;
}

const fail = (what: string, message: string): Error => new Error(`${what} failed: ${message}`);

/** The reads and the one write of «أرسل عبر واتساب» (app-send.service.ts). */
@Injectable()
export class AppSendRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async get(id: string): Promise<ThreadMessageRow | null> {
    const { data, error } = await this.db
      .from('messages')
      .select(MESSAGE_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (error) throw fail('message read', error.message);
    return data;
  }

  /**
   * app_send_until = until, compare-and-set on the status and error_code the row was read with
   * (still held or failed for the window, never claimed by the sender) and still no wamid. Only
   * that column moves: with no echo the row is as it was once the window passes. null = moved.
   */
  async start(w: AppSendWrite): Promise<ThreadMessageRow | null> {
    const { data, error } = await this.db
      .from('messages')
      .update({ app_send_until: w.until.toISOString() })
      .eq('id', w.id)
      .eq('direction', 'outbound')
      .eq('status', w.status)
      .eq('error_code', w.errorCode)
      .not('created_by', 'is', null)
      .is('wa_message_id', null)
      .select(MESSAGE_SELECT)
      .maybeSingle();
    if (error) throw fail('app send start', error.message);
    return data;
  }
}
