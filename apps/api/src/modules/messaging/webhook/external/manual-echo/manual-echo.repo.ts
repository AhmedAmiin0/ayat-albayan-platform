import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import type { ManualRow } from './manual-echo';

/** Postgres unique_violation: the wamid is already on another row (a concurrent store). */
const UNIQUE = '23505';

const fail = (what: string, message: string): Error => new Error(`${what} failed: ${message}`);

/** One echo's attach: the row, the wamid it holds now (compare-and-set), the app's wamid, when. */
export interface AttachWrite {
  id: string;
  /** null, or the old wamid of a send WhatsApp took and then failed (131047 after the fact). */
  from: string | null;
  waMessageId: string;
  /** sent_at: never before the mark, so echoAttached reads the row as attached. */
  at: Date;
}

/** The reads and the compare-and-set of the echo attach (manual-echo.service.ts). */
@Injectable()
export class ManualEchoRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** This phone's outbound sent_manually rows marked within [since, until]. */
  async candidates(phone: string, span: { since: Date; until: Date }): Promise<ManualRow[]> {
    const { data, error } = await this.db
      .from('messages')
      .select('id, body, line, number_id, sent_manually_at, wa_message_id, sent_at')
      .eq('phone_e164', phone)
      .eq('direction', 'outbound')
      .eq('status', 'sent_manually')
      .gte('sent_manually_at', span.since.toISOString())
      .lte('sent_manually_at', span.until.toISOString());
    if (error) throw fail('manual rows read', error.message);
    return data;
  }

  /**
   * The app's wamid on the row, compare-and-set (still sent_manually, still the wamid it was read
   * with): false when another echo took it, or the wamid is already on another row (unique).
   */
  async attach(w: AttachWrite): Promise<boolean> {
    const query = this.db
      .from('messages')
      .update({ wa_message_id: w.waMessageId, sent_at: w.at.toISOString() })
      .eq('id', w.id)
      .eq('status', 'sent_manually');
    const { data, error } = await (w.from === null
      ? query.is('wa_message_id', null)
      : query.eq('wa_message_id', w.from)
    ).select('id');
    if (error?.code === UNIQUE) return false;
    if (error) throw fail('manual echo attach', error.message);
    return data.length > 0;
  }
}
