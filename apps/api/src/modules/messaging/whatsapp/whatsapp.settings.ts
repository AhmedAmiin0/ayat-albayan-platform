import type { SettingKey } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';
import type { SettingsSlice } from '../../../common/settings/settings-slice';

/** The admin's two sending switches: the kill switch (fail-closed) and «الرسائل التلقائية». */
const KEYS = ['messaging_enabled', 'auto_messages_enabled'] as const satisfies readonly SettingKey[];
export type WhatsappSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/**
 * The send gate's two switches, read by SendGate (docs/26 §5, 26-P4). Never cached: every call is one
 * primary-key read of `settings`, so no SettingsService / ConfigStore cache can hold the gate open.
 * Fail-closed: only a stored JSON `true` is ON; a missing row, JSON null, a string, a number or any
 * other value is OFF; a failed read rejects, so the gate never opens on an error.
 */
@Injectable()
export class WhatsappSettings {
  constructor(@Inject(DB) private readonly db: Db) {}

  async read(): Promise<WhatsappSettingsValues> {
    const { data, error } = await this.db.from('settings').select('key, value').in('key', [...KEYS]);
    if (error) throw new Error(`send gate read failed: ${error.message}`);
    if (!Array.isArray(data)) throw new Error('send gate read failed: no rows array');
    const on = (key: (typeof KEYS)[number]): boolean =>
      data.some((row: { key: unknown; value: unknown }) => row.key === key && row.value === true);
    return { messaging_enabled: on('messaging_enabled'), auto_messages_enabled: on('auto_messages_enabled') };
  }
}
