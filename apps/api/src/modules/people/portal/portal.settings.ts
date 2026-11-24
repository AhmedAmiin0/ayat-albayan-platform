import type { SettingKey } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '@/common/settings/settings-slice';
import { SettingsService } from '@/common/settings/settings.service';

const KEYS = [
  'meeting_link_auto',
  'join_opens_before_min',
  'join_closes_after_min',
  'family_payment_instructions',
  'late_cancel_hours',
] as const satisfies readonly SettingKey[];
export type PortalSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

@Injectable()
export class PortalSettings {
  constructor(@Inject(SettingsService) private readonly store: SettingsService) {}

  read(): Promise<PortalSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
