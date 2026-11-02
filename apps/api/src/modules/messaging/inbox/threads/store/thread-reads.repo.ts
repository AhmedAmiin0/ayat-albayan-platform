import { onMessagingLine } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { newestPerLine, type ReadMark } from '@/modules/messaging/inbox/reads/read-marks';
import { check } from './check';

/** H2: the read stamp of one phone's inbound rows (unread = read_at null). */
@Injectable()
export class ThreadReadsRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * Opening the thread reads its inbound rows up to `upTo` (a created_at) or only `upTo`'s ids (a
   * delta's rows); the newest stamped wamid per line.
   */
  async markInboundRead(
    phone: string,
    at: Date,
    upTo?: string | readonly string[],
  ): Promise<ReadMark[]> {
    let query = this.db.from('messages').update({ read_at: at.toISOString() }).eq('phone_e164', phone);
    query = query.eq('direction', 'inbound').is('read_at', null);
    if (typeof upTo === 'string') query = query.lte('created_at', upTo);
    else if (upTo) query = query.in('id', [...upTo]);
    const { data, error } = await query.select('wa_message_id, created_at, line');
    check(error, 'inbound read stamp');
    return newestPerLine(data.filter(onMessagingLine)); // never a receipt from the calls number
  }
}
