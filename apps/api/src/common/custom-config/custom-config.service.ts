import type { Json } from '@ab/db';
import type { CustomConfigUpsert, CustomConfigView } from '@ab/shared';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { CACHE_KEYS } from '../cache/cache-keys';
import { SharedCache } from '../cache/shared-cache';
import { DB, type Db } from '../db/db.module';
import { CUSTOM_COLUMNS, toCustomView, type CustomConfigRow } from './custom-config.mapper';

/** The public rows' shared copy (Redis only): GET /settings/public is read by every page load. */
const PUBLIC_ROWS_TTL_MS = 60_000;

type PublicRow = { key: string; value: Json; is_public: boolean };

/** `custom_config` (migration 20261005000250): free-form admin entries, written by the service role. */
@Injectable()
export class CustomConfigService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Optional() private readonly shared?: SharedCache,
  ) {}

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

  /** Public rows only, as the GET /settings/public whitelist's input (shared for a minute with Redis). */
  publicRows(): Promise<PublicRow[]> {
    const load = (): Promise<PublicRow[]> => this.readPublic();
    return this.shared ? this.shared.read({ key: CACHE_KEYS.customPublic, ttlMs: PUBLIC_ROWS_TTL_MS, load }) : load();
  }

  private async readPublic(): Promise<PublicRow[]> {
    const { data, error } = await this.db.from('custom_config').select('key, value, is_public').eq('is_public', true);
    if (error) throw new Error(`custom_config read failed: ${error.message}`);
    return data;
  }

  async upsert(key: string, input: CustomConfigUpsert, actorId: string): Promise<CustomConfigView> {
    const row = { key, value: input.value as NonNullable<Json>, description: input.description ?? null, is_public: input.isPublic, updated_by: actorId };
    const { data, error } = await this.db.from('custom_config').upsert(row).select(CUSTOM_COLUMNS).single();
    await this.forgetPublic();
    if (error) throw new Error(`custom_config write failed: ${error.message}`);
    return toCustomView(data as CustomConfigRow);
  }

  /** false when there was no such entry. */
  async remove(key: string): Promise<boolean> {
    const { data, error } = await this.db.from('custom_config').delete().eq('key', key).select('key');
    await this.forgetPublic();
    if (error) throw new Error(`custom_config delete failed: ${error.message}`);
    return data.length > 0;
  }

  private async forgetPublic(): Promise<void> {
    await this.shared?.invalidate({ topic: 'custom-config', keys: [CACHE_KEYS.customPublic] });
  }
}
