import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../../common/settings/settings-slice';
import { SettingsService } from '../../../common/settings/settings.service';

/**
 * SalesPaymentsController: the receipt size limit (upload URL and the copy from the chat); SalesMoneyReads:
 * the admin's renewal-alert threshold (a student she owns is «due for renewal» at it, owner 2026-10-26).
 */
const KEYS = ['upload_max_mb', 'renewal_alert_remaining'] as const satisfies readonly SettingKey[];
export type SalesMoneySettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The academy settings the sales-money module reads (common/settings/settings-slice.ts). */
@Injectable()
export class SalesMoneySettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<SalesMoneySettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
