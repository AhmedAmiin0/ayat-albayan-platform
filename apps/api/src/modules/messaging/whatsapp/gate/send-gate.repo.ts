import type { SettingKey } from '@ab/settings';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { pgError } from '@/common/db/errors';

const failed =
  (what: string) =>
  (e: { message: string }): Error =>
    new Error(`${what} failed: ${e.message}`);

/** The send gate's reads: its switches' settings rows, uncached, and the outbound queue. */
@Injectable()
export class SendGateRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** A failed read rejects, so the gate never opens on an error. */
  async settingRows(keys: readonly SettingKey[]): Promise<{ key: unknown; value: unknown }[]> {
    const { data, error } = await this.db.from('settings').select('key, value').in('key', [...keys]);
    if (error) throw pgError(error, { otherwise: failed('send gate read') });
    if (!Array.isArray(data)) throw new Error('send gate read failed: no rows array');
    return data;
  }

  async queuedCount(): Promise<number> {
    const { count, error } = await this.db
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('direction', 'outbound')
      .eq('status', 'queued');
    if (error) throw pgError(error, { otherwise: failed('queue count') });
    return count ?? 0;
  }
}
