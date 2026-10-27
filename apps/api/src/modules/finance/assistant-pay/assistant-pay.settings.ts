import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../../common/settings/settings-slice';
import { SettingsService } from '../../../common/settings/settings.service';

/** TermsQueries: the renewal share shown beside the commission terms (owner 2026-10-26; SQL earns with it). */
const KEYS = ['renewal_commission_percent'] as const satisfies readonly SettingKey[];
export type AssistantPaySettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The academy settings the assistant-pay module reads (common/settings/settings-slice.ts). */
@Injectable()
export class AssistantPaySettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<AssistantPaySettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
