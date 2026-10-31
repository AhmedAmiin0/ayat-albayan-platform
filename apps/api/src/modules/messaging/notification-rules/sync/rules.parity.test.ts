import { RULE_SETTING_KEYS, SETTING_DEFAULTS, type AcademySettings, type NotificationRuleRow } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import type { ActivityWriter } from '@/common/telemetry/activity/activity.writer';
import type { AuditService } from '@/common/audit/audit.service';
import { fakeSettings } from '@/common/settings/settings.fakes';
import { RulesSourceSettings } from '@/modules/messaging/notification-rules/rules-source.settings';
import { RulesJournal } from '@/modules/messaging/notification-rules/store/rules.journal';
import { RulesParity } from './rules.parity';
import { RulesPersist } from '@/modules/messaging/notification-rules/store/rules.persist';
import { DbRulesReader } from '@/modules/messaging/notification-rules/store/rules.store';
import type { RulesTable } from '@/modules/messaging/notification-rules/store/rules.table';

const ROWS: NotificationRuleRow[] = [
  { key: 'lesson_reminder', enabled: true, channels: null, timing: { minutes_before: 30 }, number_id: null, updated_at: 'x', updated_by: null },
];

function setup(over: Partial<AcademySettings> = {}) {
  const store = fakeSettings({ comms_source: 'module', ...over });
  const table = { rows: vi.fn(async () => ROWS) } as unknown as RulesTable;
  const settings = new RulesSourceSettings(store, 30_000);
  const reader = new DbRulesReader(table, settings);
  const audit = { record: vi.fn(async () => undefined) };
  const journal = new RulesJournal(audit as unknown as AuditService, { push: vi.fn() } as unknown as ActivityWriter);
  return { parity: new RulesParity(new RulesPersist(table, settings, reader), journal), store, audit, table };
}

describe('RulesParity (docs/23b decision 5)', () => {
  it('differences: the rule vs the legacy key, read fresh every time', async () => {
    const t = setup();
    expect(await t.parity.differences()).toEqual([{ key: 'lesson_reminder', field: 'timing', legacy: '{"minutes_before":60}', module: '{"minutes_before":30}' }]);
    await t.parity.differences();
    expect(t.table.rows).toHaveBeenCalledTimes(2);
  });

  it('copyToLegacy: one write of the 8 keys as the rules say them, audited; never a send switch', async () => {
    const t = setup();
    const values = await t.parity.copyToLegacy('actor');
    expect(values.reminder_minutes_before).toBe(30);
    expect(t.store.write).toHaveBeenCalledTimes(1);
    const written = (t.store.write as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(Object.keys(written).sort()).toEqual([...RULE_SETTING_KEYS].sort());
    expect(written).toMatchObject({ feedback_mode: SETTING_DEFAULTS.feedback_mode });
    expect(t.audit.record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'settings', action: 'rules_to_legacy' }));
  });
});
