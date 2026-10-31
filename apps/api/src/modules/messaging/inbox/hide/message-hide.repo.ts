import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';

/**
 * What a hide or show reads of the message: its chat, a template (sales' wall), its hidden state.
 */
export interface HideTarget {
  id: string;
  phone_e164: string;
  template_key: string | null;
  hidden_at: string | null;
}

export interface HideChange {
  id: string;
  /** The staff member hiding; null shows it again. */
  by: string | null;
  at: string;
}

/** messages.hidden_at / hidden_by («حذف من المنصة», migration 986; service role). */
@Injectable()
export class MessageHideRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async target(id: string): Promise<HideTarget | null> {
    const { data, error } = await this.db
      .from('messages')
      .select('id, phone_e164, template_key, hidden_at')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`message read failed: ${error.message}`);
    return data;
  }

  /** Compare-and-set: true when this call changed the row (a repeated hide or show is a no-op). */
  async set(change: HideChange): Promise<boolean> {
    const hide = change.by !== null;
    const patch = hide
      ? { hidden_at: change.at, hidden_by: change.by }
      : { hidden_at: null, hidden_by: null };
    const base = this.db.from('messages').update(patch).eq('id', change.id);
    const query = hide ? base.is('hidden_at', null) : base.not('hidden_at', 'is', null);
    const { data, error } = await query.select('id');
    if (error) throw new Error(`message hide failed: ${error.message}`);
    return data.length > 0;
  }
}
