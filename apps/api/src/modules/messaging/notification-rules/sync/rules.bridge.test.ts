import { SETTING_DEFAULTS, type AcademySettings, type NotificationRuleRow } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { RulesSettingsBridge } from './rules.bridge';
import type { RulesSnapshot } from '../store/rules.reader';
import type { DbRulesReader } from '../store/rules.store';
import type { RulesWriter } from '../store/rules.writer';

const row = (r: Partial<NotificationRuleRow>): NotificationRuleRow => ({
  key: r.key ?? '', enabled: true, channels: null, timing: null, number_id: null, updated_at: 'x', updated_by: null, ...r,
});
const ROWS = new Map([
  ['lesson_reminder', row({ key: 'lesson_reminder', timing: { minutes_before: 30 } })],
  ['follow_up_slots', row({ key: 'follow_up_slots', timing: { hours: [24, 72], slots_from_hours: 5, slots_to_days: 9 } })],
]);
const ADMIN: AuthUser = { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' };

function bridge(opts: { fail?: boolean; mode?: 'legacy' | 'module' } = {}) {
  const snap: RulesSnapshot = { mode: opts.mode ?? 'module', rows: ROWS, settings: SETTING_DEFAULTS };
  const read = vi.fn(async () => {
    if (opts.fail) throw new Error('rules read failed');
    return snap;
  });
  const reader = { snapshot: read, fresh: read } as unknown as DbRulesReader;
  const writer = { apply: vi.fn(async () => 'follow_up_slots') };
  return { b: new RulesSettingsBridge(reader, writer as unknown as RulesWriter), writer, read };
}

describe('RulesSettingsBridge.overlay (docs/26b m1/m3)', () => {
  const module: AcademySettings = { ...SETTING_DEFAULTS, comms_source: 'module', messaging_enabled: false, booking_horizon_weeks: 6 };

  it('module mode: the 8 keys from the rules; every other key unchanged', async () => {
    const out = await bridge().b.overlay(module);
    expect(out).toMatchObject({ reminder_minutes_before: 30, follow_up_slots_from_hours: 5, follow_up_slots_to_days: 9 });
    const others = Object.keys(module).filter((k) => !['reminder_minutes_before', 'follow_up_slots_from_hours', 'follow_up_slots_to_days'].includes(k));
    for (const k of others) expect([k, out[k as keyof AcademySettings]]).toEqual([k, module[k as keyof AcademySettings]]);
  });

  it('legacy mode: unchanged and no rules read', async () => {
    const t = bridge();
    const legacy = { ...SETTING_DEFAULTS, comms_source: 'legacy' as const };
    expect(await t.b.overlay(legacy)).toBe(legacy);
    expect(t.read).not.toHaveBeenCalled();
  });

  it('rules unreadable: the stored settings unchanged (logged), never a failure', async () => {
    expect(await bridge({ fail: true }).b.overlay(module)).toEqual(module);
  });
});

describe('RulesSettingsBridge.writeFollowUpHours', () => {
  it('writes follow_up_slots’ hours keeping its other timing fields', async () => {
    const t = bridge();
    await t.b.writeFollowUpHours([6, 12], ADMIN);
    expect(t.writer.apply).toHaveBeenCalledWith({
      key: 'follow_up_slots',
      body: { timing: { hours: [6, 12], slots_from_hours: 5, slots_to_days: 9 } },
      actor: ADMIN,
    });
  });

  it('rules unreadable: 503, nothing written', async () => {
    const t = bridge({ fail: true });
    await expect(t.b.writeFollowUpHours([6], ADMIN)).rejects.toMatchObject({ status: 503 });
    expect(t.writer.apply).not.toHaveBeenCalled();
  });
});
