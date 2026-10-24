import { SETTING_DEFAULTS, type AcademySettings } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../auth/verify-token';
import { fakeSettings } from './settings.fakes';
import { SettingsController } from './settings.controller';
import type { SettingsRulesPort } from './settings-rules.port';

// 23-P4: the 0.2.0 phone's followUpHours goes through the follow-up rule, applied BEFORE the other
// fields, so a refused rule write saves nothing else; whatever was written is audited.

const ADMIN: AuthUser = { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin', permissions: ['settings.write', 'notifications.manage'] };

function setup() {
  const order: string[] = [];
  const settings = fakeSettings();
  vi.mocked(settings.write).mockImplementation(async () => {
    order.push('settings');
  });
  const rules = {
    overlay: vi.fn(async (s: AcademySettings) => s),
    writeFollowUpHours: vi.fn(async () => {
      order.push('rule');
    }),
  };
  const audit = { record: vi.fn(async () => undefined) };
  const ctl = new SettingsController(settings, audit as unknown as AuditService, rules as unknown as SettingsRulesPort);
  return { ctl, settings, rules, audit, order };
}

describe('PATCH /settings with followUpHours (notifications.manage)', () => {
  it('writes the rule first, then the other fields, audits once, keeps the 0.2.0 response shape', async () => {
    const t = setup();
    const res = await t.ctl.update({ followUpHours: [24, 48], lateCancelHours: 12 }, ADMIN);
    expect(t.order).toEqual(['rule', 'settings']);
    expect(t.rules.writeFollowUpHours).toHaveBeenCalledWith([24, 48], ADMIN);
    expect(t.settings.write).toHaveBeenCalledWith({ late_cancel_hours: 12 }, ADMIN.id);
    expect(t.audit.record).toHaveBeenCalledTimes(1);
    expect(res).toMatchObject({ ...SETTING_DEFAULTS, saved: expect.arrayContaining(['follow_up_hours', 'late_cancel_hours']), moved: [], invalid: [] });
  });

  for (const status of [503, 422]) {
    it(`a refused rule write (${status}) saves nothing else and audits nothing`, async () => {
      const t = setup();
      t.rules.writeFollowUpHours.mockRejectedValueOnce(Object.assign(new Error('rule refused'), { status }));
      await expect(t.ctl.update({ followUpHours: [24], lateCancelHours: 12 }, ADMIN)).rejects.toThrow('rule refused');
      expect(t.settings.write).not.toHaveBeenCalled();
      expect(t.audit.record).not.toHaveBeenCalled();
    });
  }

  it('a failed settings write after the rule was saved is still audited (the rule changed)', async () => {
    const t = setup();
    vi.mocked(t.settings.write).mockRejectedValueOnce(new Error('settings write failed'));
    await expect(t.ctl.update({ followUpHours: [24], lateCancelHours: 12 }, ADMIN)).rejects.toThrow('settings write failed');
    expect(t.rules.writeFollowUpHours).toHaveBeenCalledTimes(1);
    expect(t.audit.record).toHaveBeenCalledTimes(1);
  });

  it('followUpHours alone: only the rule is written, audited once', async () => {
    const t = setup();
    await t.ctl.update({ followUpHours: [24] }, ADMIN);
    expect(t.settings.write).not.toHaveBeenCalled();
    expect(t.audit.record).toHaveBeenCalledTimes(1);
  });
});
