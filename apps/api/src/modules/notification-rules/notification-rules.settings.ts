import { CATALOGUE_SETTING_KEYS } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../common/settings/settings-slice';
import { SettingsService } from '../../common/settings/settings.service';

/** Exactly the catalogue's slice (CatalogueSettings): the sending gates, the rows' switches and timings. */
const KEYS = CATALOGUE_SETTING_KEYS;
export type NotificationRulesSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The notification catalogue's academy settings (docs/25 §4), read by RulesService. One cached store.all(), only these keys. */
@Injectable()
export class NotificationRulesSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<NotificationRulesSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
