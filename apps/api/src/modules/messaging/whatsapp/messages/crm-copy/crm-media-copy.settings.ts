import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../../../../common/settings/settings-slice';
import { SettingsService } from '../../../../../common/settings/settings.service';

/** The copy-all switch (owner 2026-10-27) and the CRM storage host it copies from (crm-history). */
const KEYS = ['crm_media_copy_all', 'crm_media_host'] as const satisfies readonly SettingKey[];
type CrmMediaCopySettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** CrmMediaCopyJob's settings (common/settings/settings-slice.ts): read each tick, switched off when done. */
@Injectable()
export class CrmMediaCopySettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<CrmMediaCopySettingsValues> {
    return readSlice(this.store, KEYS);
  }

  /** The job's own «done»: one unversioned write (OFF is always accepted, docs/26 §2f), no actor. */
  turnOff(): Promise<void> {
    return this.store.writeSwitch('crm_media_copy_all', false, null);
  }
}
