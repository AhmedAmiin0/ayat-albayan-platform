import { RULE_SETTING_KEYS, notificationEntry, resolveRule, type AcademySettings, type RuleSettings } from '@ab/shared';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { SettingsRulesPort } from '../../common/settings/settings-rules.port';
import type { AuthUser } from '../../common/auth/verify-token';
import { moduleLegacyValues } from './rules.mirror';
import { DbRulesReader } from './rules.store';
import { RulesWriter } from './rules.writer';

const ruleSettingsOf = (s: AcademySettings): RuleSettings =>
  Object.fromEntries(RULE_SETTING_KEYS.map((k) => [k, s[k]])) as RuleSettings;

/** SettingsRulesPort over the rules (docs/26b m1/m3; docs/26 §2f followUpHours after 23-P4). */
@Injectable()
export class RulesSettingsBridge extends SettingsRulesPort {
  private readonly log = new Logger(RulesSettingsBridge.name);

  constructor(
    private readonly reader: DbRulesReader,
    private readonly writer: RulesWriter,
  ) {
    super();
  }

  /** Module mode only (the given settings' comms_source): only RULE_SETTING_KEYS change. Unreadable rules: unchanged. */
  async overlay(settings: AcademySettings): Promise<AcademySettings> {
    if (settings?.comms_source !== 'module') return settings;
    try {
      const { rows } = await this.reader.snapshot();
      const values = moduleLegacyValues({ rows, settings: ruleSettingsOf(settings) });
      const only = Object.fromEntries(Object.entries(values).filter(([k]) => (RULE_SETTING_KEYS as readonly string[]).includes(k)));
      return { ...settings, ...only };
    } catch (e) {
      this.log.warn(`settings overlay skipped (rules unread): ${e instanceof Error ? e.message : String(e)}`);
      return settings;
    }
  }

  /** follow_up_slots' hours, keeping its other timing fields (the current effective ones). */
  async writeFollowUpHours(hours: readonly number[], actor: AuthUser): Promise<void> {
    const snap = await this.reader.fresh().catch(() => {
      throw new ServiceUnavailableException({ message: 'rules_unavailable' });
    });
    const current = resolveRule(notificationEntry('follow_up_slots'), {
      mode: snap.mode,
      row: snap.rows.get('follow_up_slots') ?? null,
      settings: snap.settings,
    }).timing;
    await this.writer.apply({ key: 'follow_up_slots', body: { timing: { ...current, hours: [...hours] } }, actor });
  }
}
