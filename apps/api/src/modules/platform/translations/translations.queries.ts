import type { Locale } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';

export interface OverrideRow {
  key: string;
  locale: string;
  value: string;
}

export interface OverrideWrite {
  locale: Locale;
  key: string;
  value: string;
  actorId: string;
}

/** All supabase access for `translation_overrides` (service role; writes behind the admin guard). */
@Injectable()
export class TranslationsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async all(): Promise<OverrideRow[]> {
    const { data, error } = await this.db.from('translation_overrides').select('key, locale, value');
    if (error) throw new Error(`translation_overrides read failed: ${error.message}`);
    return data;
  }

  async upsert(w: OverrideWrite): Promise<void> {
    const { error } = await this.db.from('translation_overrides').upsert({
      key: w.key,
      locale: w.locale,
      value: w.value,
      updated_by: w.actorId,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(`translation_overrides write failed: ${error.message}`);
  }

  async remove(locale: Locale, key: string): Promise<void> {
    const { error } = await this.db.from('translation_overrides').delete().eq('locale', locale).eq('key', key);
    if (error) throw new Error(`translation_overrides delete failed: ${error.message}`);
  }
}
