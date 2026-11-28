import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { pgError } from '@/common/db/errors';
import type { Tables, TablesInsert } from '@ab/db';

const readFailed = (e: { message: string }): Error =>
  new Error(`line health read failed: ${e.message}`);

/** The wa_line_health table (migration 20261022000600): one kept row per line. */
@Injectable()
export class LineHealthRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The write's error message, or null; the caller decides it is not fatal. */
  async upsert(rows: TablesInsert<'wa_line_health'>[]): Promise<string | null> {
    const { error } = await this.db.from('wa_line_health').upsert(rows, { onConflict: 'line' });
    return error ? error.message : null;
  }

  async rows(): Promise<Omit<Tables<'wa_line_health'>, 'updated_at'>[]> {
    const { data, error } = await this.db
      .from('wa_line_health')
      .select('line, display_phone_e164, verified_name, checked_at, phone_number_id')
      .order('line');
    if (error) throw pgError(error, { otherwise: readFailed });
    return data;
  }
}
