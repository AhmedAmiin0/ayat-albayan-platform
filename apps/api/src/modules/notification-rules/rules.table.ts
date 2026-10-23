import type { Json } from '@ab/db';
import type { NotificationRuleRow } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';

/** The writable part of a row (updated_at is set by the database). */
export type RuleRowWrite = Pick<NotificationRuleRow, 'key' | 'enabled' | 'channels' | 'timing' | 'number_id'>;

const COLUMNS = 'key, enabled, channels, timing, number_id, updated_at, updated_by';

/** public.notification_rules and the wa_numbers lookup (service role; RLS: admins read, the API writes). */
@Injectable()
export class RulesTable {
  constructor(@Inject(DB) private readonly db: Db) {}

  async rows(): Promise<NotificationRuleRow[]> {
    const { data, error } = await this.db.from('notification_rules').select(COLUMNS);
    if (error) throw new Error(`notification_rules read failed: ${error.message}`);
    return data;
  }

  async upsert(row: RuleRowWrite, actorId: string): Promise<void> {
    const timing = (row.timing ?? null) as Json | null;
    const { error } = await this.db
      .from('notification_rules')
      .upsert({ ...row, timing, updated_by: actorId, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) throw new Error(`notification_rules write failed: ${error.message}`);
  }

  async numberExists(id: string): Promise<boolean> {
    const { data, error } = await this.db.from('wa_numbers').select('id').eq('id', id).maybeSingle();
    if (error) throw new Error(`wa_numbers read failed: ${error.message}`);
    return data !== null;
  }
}
