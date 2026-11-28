import type { Json } from '@ab/db';
import type { NotificationRuleRow } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { done, maybe, rows } from '@/common/db/errors';
import type { RuleRowWrite } from './rules-table.types';

const COLUMNS = 'key, enabled, channels, timing, number_id, updated_at, updated_by';

/**
 * public.notification_rules and the wa_numbers lookup (service role; RLS: admins read, the API
 * writes).
 */
@Injectable()
export class RulesTableRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async rows(): Promise<NotificationRuleRow[]> {
    return rows(await this.db.from('notification_rules').select(COLUMNS));
  }

  async upsert(row: RuleRowWrite, actorId: string): Promise<void> {
    const timing = (row.timing ?? null) as Json | null;
    const write = { ...row, timing, updated_by: actorId, updated_at: new Date().toISOString() };
    done(await this.db.from('notification_rules').upsert(write, { onConflict: 'key' }));
  }

  async numberExists(id: string): Promise<boolean> {
    const query = this.db.from('wa_numbers').select('id, purpose').eq('id', id);
    const data = maybe(await query.maybeSingle());
    // A calls number never sends a notification (docs/28 §10): not a number a rule can pick.
    return data !== null && data.purpose !== 'calls';
  }
}
