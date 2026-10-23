import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../common/settings/settings-slice';
import { SettingsService } from '../../common/settings/settings.service';

/**
 * SalesAssignService (sales_auto_assign), SalesScheduleService (meeting mode) and SalesService
 * (the classroom window of a meeting).
 */
const KEYS = [
  'sales_auto_assign',
  'meeting_link_auto',
  'join_opens_before_min',
  'join_closes_after_min',
] as const satisfies readonly SettingKey[];
export type SalesSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The academy settings the sales module reads (common/settings/settings-slice.ts). */
@Injectable()
export class SalesSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<SalesSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
