import { describe, expect, it } from 'vitest';
import { fakePolicy, type FakePolicyInput } from '../../messaging/notification-rules/policy/policy.fakes';
import { LeadProfileService, mergeQualification } from './lead-profile.service';
import { fakeDeps, lead, LEAD_ID } from './leads.fakes';

const ACTOR = 'a0000000-0000-4000-8000-000000000001';

function setup(row = lead(), rules: FakePolicyInput = {}) {
  const deps = fakeDeps();
  deps.leads.findById.mockResolvedValue(row);
  deps.leads.update.mockImplementation(async (_id: string, patch: object) => ({ ...row, ...patch }));
  const service = new LeadProfileService(deps.asLeads, fakePolicy(rules), deps.asAudit);
  return { ...deps, service };
}

describe('mergeQualification (L1, R-LEAD-03)', () => {
  it('sent keys overwrite, null clears, the rest stays', () => {
    const current = { student_name: 'ياسمين', age: 9, level: 'جزء عم' };
    expect(mergeQualification(current, { age: 10, level: null, tz: 'Africa/Cairo' })).toEqual({
      student_name: 'ياسمين',
      age: 10,
      tz: 'Africa/Cairo',
    });
    expect(mergeQualification(null, { goal: 'حفظ' })).toEqual({ goal: 'حفظ' });
  });
});

describe('LeadProfileService (L1/L2)', () => {
  it('L1 writes the merged qualification and audits before/after', async () => {
    const { service, leads, audit } = setup(lead({ qualification: { age: 9 } }));
    const out = await service.qualification({ id: LEAD_ID, patch: { goal: 'حفظ' }, actorId: ACTOR });
    expect(leads.update).toHaveBeenCalledWith(LEAD_ID, { qualification: { age: 9, goal: 'حفظ' } });
    expect(out.qualification).toEqual({ age: 9, goal: 'حفظ' });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'qualification_update', before: { qualification: { age: 9 } } }));
  });

  it('L2 pause clears next_follow_up_at; resume recomputes it (24 h after the last message)', async () => {
    const row = lead({ status: 'no_reply', last_inbound_at: '2026-10-01T10:00:00Z', follow_up_paused: true });
    const { service, leads } = setup(row);
    await service.followUp({ id: LEAD_ID, patch: { paused: false }, actorId: ACTOR });
    expect(leads.update).toHaveBeenLastCalledWith(LEAD_ID, {
      follow_up_paused: false,
      follow_up_paused_by: null,
      next_follow_up_at: '2026-10-02T10:00:00.000Z',
    });
    await service.followUp({ id: LEAD_ID, patch: { paused: true }, actorId: ACTOR });
    expect(leads.update).toHaveBeenLastCalledWith(LEAD_ID, {
      follow_up_paused: true,
      follow_up_paused_by: 'admin',
      next_follow_up_at: null,
    });
  });

  it.each([
    ['legacy: settings.follow_up_hours', { settings: { follow_up_hours: [6, 48] } }, '2026-10-01T16:00:00.000Z'],
    ['module: the follow_up_slots row', { mode: 'module' as const, rows: [{ key: 'follow_up_slots', timing: { hours: [12], slots_from_hours: 12, slots_to_days: 7 } }] }, '2026-10-01T22:00:00.000Z'],
    ['rules unreadable: the default 24 h (a display, not a send)', { fail: true }, '2026-10-02T10:00:00.000Z'],
  ])('resume uses the follow-up hours — %s', async (_name, rules, next) => {
    const { service, leads } = setup(lead({ status: 'no_reply', last_inbound_at: '2026-10-01T10:00:00Z', follow_up_paused: true }), rules);
    await service.followUp({ id: LEAD_ID, patch: { paused: false }, actorId: ACTOR });
    expect(leads.update).toHaveBeenLastCalledWith(LEAD_ID, expect.objectContaining({ next_follow_up_at: next }));
  });

  it('404 for an unknown lead', async () => {
    const { service, leads } = setup();
    leads.findById.mockResolvedValue(null);
    await expect(service.followUp({ id: LEAD_ID, patch: { paused: true }, actorId: ACTOR })).rejects.toMatchObject({ status: 404 });
  });
});
