import type { SettingMeta } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { neverWritten } from '@/common/configuration/config-store/config-store.types';
import { DB, type Db } from '@/common/db/db.module';

/**
 * Who last changed each stored setting. Rows that were never written have no entry: a missing row, and
 * a row the seeder created (JSON null with no writer; an admin's null save has updated_by set).
 */
@Injectable()
export class SettingsMetaRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async meta(): Promise<Record<string, SettingMeta>> {
    const res = await this.db.from('settings').select('key, value, updated_at, updated_by');
    if (res.error) throw new Error(`settings read failed: ${res.error.message}`);
    const data = res.data.filter((r) => !neverWritten({ value: r.value as unknown, updatedBy: r.updated_by }));
    const ids = [...new Set(data.map((r) => r.updated_by).filter((id): id is string => id !== null))];
    const names = new Map<string, string>();
    if (ids.length > 0) {
      const profiles = await this.db.from('profiles').select('id, full_name').in('id', ids);
      if (profiles.error) throw new Error(`profiles read failed: ${profiles.error.message}`);
      for (const p of profiles.data) names.set(p.id, p.full_name);
    }
    return Object.fromEntries(
      data.map((r) => [r.key, { updatedAt: r.updated_at, updatedBy: r.updated_by, updatedByName: r.updated_by ? (names.get(r.updated_by) ?? null) : null }]),
    );
  }
}
