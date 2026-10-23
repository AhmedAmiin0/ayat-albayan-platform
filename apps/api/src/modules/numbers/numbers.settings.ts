import type { CommsSource, SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../common/settings/settings-slice';
import { SettingsService } from '../../common/settings/settings.service';

/** Where the line config comes from (docs/23 §2e). An unknown or malformed row reads as legacy. */
const KEYS = ['comms_source'] as const satisfies readonly SettingKey[];
export type NumbersSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/**
 * The numbers module's academy settings (docs/25 §4). Also the ONE writer of comms_source (PATCH
 * /settings ignores it): POST /admin/communications/source, after its parity check. It writes that
 * key only, never messaging_enabled or any other switch.
 */
@Injectable()
export class NumbersSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<NumbersSettingsValues> {
    return readSlice(this.store, KEYS);
  }

  writeSource(source: CommsSource, actorId: string): Promise<void> {
    return this.store.write({ comms_source: source }, actorId);
  }
}
