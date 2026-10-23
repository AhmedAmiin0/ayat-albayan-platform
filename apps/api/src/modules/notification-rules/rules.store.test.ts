import type { NotificationRuleRow } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { fakeSettings } from '../../common/settings/settings.fakes';
import { RulesSourceSettings } from './rules-source.settings';
import { DbRulesReader } from './rules.store';
import type { RulesTable } from './rules.table';

const ROW: NotificationRuleRow = { key: 'lesson_reminder', enabled: true, channels: null, timing: { minutes_before: 30 }, number_id: null, updated_at: 'x', updated_by: null };

function reader(opts: { ttl?: number; source?: unknown } = {}) {
  const store = fakeSettings({ comms_source: opts.source as 'legacy' | undefined, reminder_minutes_before: 45 });
  const rows = vi.fn(async () => [ROW]);
  const table = { rows } as unknown as RulesTable;
  return { r: new DbRulesReader(table, new RulesSourceSettings(store, opts.ttl ?? 30_000)), rows, store };
}

describe('DbRulesReader (rules.store.ts)', () => {
  it('one snapshot: the mode, the rows by key and exactly the 8 legacy keys', async () => {
    const { r } = reader({ source: 'module' });
    const s = await r.snapshot();
    expect(s.mode).toBe('module');
    expect(s.rows.get('lesson_reminder')).toEqual(ROW);
    expect(Object.keys(s.settings).sort()).toEqual(
      ['feedback_mode', 'follow_up_hours', 'follow_up_slots_from_hours', 'follow_up_slots_to_days', 'reminder_24h_enabled', 'reminder_minutes_before', 'teacher_whatsapp_lesson_reminder', 'teacher_whatsapp_new_student'],
    );
    expect(s.settings.reminder_minutes_before).toBe(45);
  });

  it('anything but exactly module reads as legacy', async () => {
    for (const source of ['legacy', undefined]) expect((await reader({ source }).r.snapshot()).mode).toBe('legacy');
  });

  it('caches for the TTL; invalidate() and fresh() read again; ttl 0 never caches', async () => {
    const t = reader();
    await t.r.snapshot(1000);
    await t.r.snapshot(2000);
    expect(t.rows).toHaveBeenCalledTimes(1);
    await t.r.snapshot(1000 + 30_000);
    expect(t.rows).toHaveBeenCalledTimes(2);
    t.r.invalidate();
    await t.r.snapshot(1000 + 30_001);
    await t.r.fresh();
    expect(t.rows).toHaveBeenCalledTimes(4);
    const zero = reader({ ttl: 0 });
    await zero.r.snapshot();
    await zero.r.snapshot();
    expect(zero.rows).toHaveBeenCalledTimes(2);
  });

  it('fresh() also drops the settings cache (no 30 s stale comms_source / legacy keys); snapshot() does not', async () => {
    const t = reader();
    await t.r.snapshot(1000);
    expect(t.store.invalidate).not.toHaveBeenCalled();
    await t.r.fresh();
    expect(t.store.invalidate).toHaveBeenCalledTimes(1);
    const order = [vi.mocked(t.store.invalidate), vi.mocked(t.store.all)].map((f) => f.mock.invocationCallOrder.at(-1) ?? 0);
    expect(order[0]).toBeLessThan(order[1] ?? 0);
  });

  it('never caches a failure', async () => {
    const t = reader();
    t.rows.mockRejectedValueOnce(new Error('notification_rules read failed'));
    await expect(t.r.snapshot(1000)).rejects.toThrow('notification_rules read failed');
    await expect(t.r.snapshot(1001)).resolves.toMatchObject({ mode: 'legacy' });
    expect(t.rows).toHaveBeenCalledTimes(2);
  });
});

describe('RulesSourceSettings.writeLegacy', () => {
  it('writes only RULE_SETTING_KEYS; an empty set writes nothing', async () => {
    const store = fakeSettings();
    const s = new RulesSourceSettings(store, 0);
    await s.writeLegacy({}, 'actor');
    expect(store.write).not.toHaveBeenCalled();
    await s.writeLegacy({ reminder_24h_enabled: true, ...({ messaging_enabled: true } as object) }, 'actor');
    expect(store.write).toHaveBeenCalledWith({ reminder_24h_enabled: true }, 'actor');
  });
});
