import type { Json } from '@ab/db';
import type { CustomConfigUpsert, CustomConfigView } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../db/db.module';
import { CUSTOM_COLUMNS, toCustomView, type CustomConfigRow } from './custom-config.mapper';

/** `custom_config` (migration 20261005000250): free-form admin entries, written by the service role. */
@Injectable()
export class CustomConfigService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list(): Promise<CustomConfigView[]> {
    const { data, error } = await this.db.from('custom_config').select(CUSTOM_COLUMNS).order('key');
    if (error) throw new Error(`custom_config read failed: ${error.message}`);
    return data.map(toCustomView);
  }

  async find(key: string): Promise<CustomConfigView | null> {
    const { data, error } = await this.db.from('custom_config').select(CUSTOM_COLUMNS).eq('key', key).maybeSingle();
    if (error) throw new Error(`custom_config read failed: ${error.message}`);
    return data ? toCustomView(data as CustomConfigRow) : null;
  }

  /** Public rows only, as the GET /config whitelist's input. */
  async publicRows(): Promise<{ key: string; value: Json; is_public: boolean }[]> {
    const { data, error } = await this.db.from('custom_config').select('key, value, is_public').eq('is_public', true);
    if (error) throw new Error(`custom_config read failed: ${error.message}`);
    return data;
  }

  async upsert(key: string, input: CustomConfigUpsert, actorId: string): Promise<CustomConfigView> {
    const row = { key, value: input.value as NonNullable<Json>, description: input.description ?? null, is_public: input.isPublic, updated_by: actorId };
    const { data, error } = await this.db.from('custom_config').upsert(row).select(CUSTOM_COLUMNS).single();
    if (error) throw new Error(`custom_config write failed: ${error.message}`);
    return toCustomView(data as CustomConfigRow);
  }

  /** false when there was no such entry. */
  async remove(key: string): Promise<boolean> {
    const { data, error } = await this.db.from('custom_config').delete().eq('key', key).select('key');
    if (error) throw new Error(`custom_config delete failed: ${error.message}`);
    return data.length > 0;
  }
}
