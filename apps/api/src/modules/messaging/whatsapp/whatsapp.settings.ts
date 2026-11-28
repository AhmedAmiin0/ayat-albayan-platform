import type { SettingKey } from '@ab/settings';
import { Injectable } from '@nestjs/common';
import type { SettingsSlice } from '@/common/settings/settings-slice';
import { SendGateRepo } from '@/modules/messaging/whatsapp/gate/send-gate.repo';

/** The kill switch is fail-closed. */
const KEYS = ['messaging_enabled', 'auto_messages_enabled'] as const satisfies readonly SettingKey[];
type WhatsappSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/**
 * The send gate's two switches, read by SendGate (docs/26 §5, 26-P4). Never cached: every call is
 * one primary-key read of `settings`, so no SettingsService / ConfigStore cache can hold the gate
 * open. Fail-closed: only a stored JSON `true` is ON; a missing row, JSON null, a string, a number
 * or any other value is OFF; a failed read rejects, so the gate never opens on an error.
 */
@Injectable()
export class WhatsappSettings {
  constructor(private readonly repo: SendGateRepo) {}

  async read(): Promise<WhatsappSettingsValues> {
    const data = await this.repo.settingRows(KEYS);
    const on = (key: (typeof KEYS)[number]): boolean =>
      data.some((row) => row.key === key && row.value === true);
    return {
      messaging_enabled: on('messaging_enabled'),
      auto_messages_enabled: on('auto_messages_enabled'),
    };
  }
}
