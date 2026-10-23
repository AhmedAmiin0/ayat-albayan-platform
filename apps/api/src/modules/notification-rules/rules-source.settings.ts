import { RULE_SETTING_KEYS, type RuleSettings, type SettingKey } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../common/settings/settings-slice';
import { SETTINGS_CACHE_MS, SettingsService } from '../../common/settings/settings.service';

/** What the rules read from settings: where producers read (comms_source) and the 8 legacy keys. */
const KEYS = ['comms_source', ...RULE_SETTING_KEYS] as const satisfies readonly SettingKey[];
export type RulesSourceValues = SettingsSlice<(typeof KEYS)[number]>;

/**
 * The notification rules' academy settings (docs/23b). Also the one writer of the 8 legacy keys
 * since they became owned (PATCH /settings moves them): a rule write in legacy mode and the flip back
 * to legacy mirror the rules into them here. Never writes comms_source or any sending switch.
 */
@Injectable()
export class RulesSourceSettings {
  constructor(
    private readonly store: SettingsService,
    @Inject(SETTINGS_CACHE_MS) readonly ttlMs: number,
  ) {}

  read(): Promise<RulesSourceValues> {
    return readSlice(this.store, KEYS);
  }

  /** Only RULE_SETTING_KEYS (typed); an empty object writes nothing. */
  async writeLegacy(values: Partial<RuleSettings>, actorId: string): Promise<void> {
    const only = Object.fromEntries(Object.entries(values).filter(([k]) => (RULE_SETTING_KEYS as readonly string[]).includes(k)));
    if (Object.keys(only).length === 0) return;
    await this.store.write(only as Partial<RuleSettings>, actorId);
  }
}
