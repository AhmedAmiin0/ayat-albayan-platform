import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../../common/settings/settings-slice';
import { SettingsService } from '../../../common/settings/settings.service';

/** The 12-month table's currency (ExpenseYearService) and the zone «تكرار شهري» counts months in (ExpensesJob). */
const KEYS = ['reporting_currency', 'academy_timezone'] as const satisfies readonly SettingKey[];
export type ExpensesSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The expenses module's academy settings (docs/25 §4). One cached store.all(), only these keys. */
@Injectable()
export class ExpensesSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<ExpensesSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
