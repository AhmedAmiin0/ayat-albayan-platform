import { SETTING_DEFAULTS, type SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../../common/settings/settings-slice';
import { SettingsService } from '../../../common/settings/settings.service';

/**
 * ThreadFileSender: the size limit of a file sent from the chat (owner 2026-10-19 #2); the chat
 * list: the renewal-alert threshold its gray «needs renewal» avatar ring uses (familyRing).
 */
const KEYS = ['upload_max_mb', 'renewal_alert_remaining'] as const satisfies readonly SettingKey[];
export type InboxSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The academy settings the inbox module reads (common/settings/settings-slice.ts). */
@Injectable()
export class InboxSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<InboxSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}

/**
 * The renewal_due threshold for the list's ring. A failed or absent read (unit tests) falls back to
 * the default: the chat list still answers, only a ring may be off by the admin's change.
 */
export async function renewalThreshold(settings: InboxSettings | undefined): Promise<number> {
  const read = await settings?.read().catch(() => null);
  return read?.renewal_alert_remaining ?? SETTING_DEFAULTS.renewal_alert_remaining;
}
