import { describe, expect, it } from 'vitest';
import { lead } from '../../../sales/leads/leads.fakes';
import { event, GUARDIAN_ID, NEW_LEAD_ID, nobody, services } from '../webhook.fakes';

const LEAD_ID = '00000000-0000-4000-8000-0000000000c2';
const knownLead = { ...nobody(), lead: { id: LEAD_ID, name: 'سارة', follow_up_stage: 0 } };
const guardian = { ...nobody(), guardian: { id: GUARDIAN_ID, name: 'أم سهيلة' } };

describe('InboundService: the assistants an inbound alert goes to (docs/21 §6)', () => {
  it("a known lead owned by A: notifySales('new_message', …, ['A'])", async () => {
    const s = services();
    s.queries.identify.mockResolvedValue(knownLead);
    s.leads.upsertByPhone.mockResolvedValue(lead({ id: LEAD_ID, assigned_to: 'A' }));
    await s.inbound.handle(event());
    expect(s.push.notifySales).toHaveBeenCalledWith('new_message', expect.objectContaining({ subject: expect.any(String) }), ['A']);
  });

  it('a guardian: the owners of the family (brought by A and B, converted lead of C)', async () => {
    const s = services();
    s.queries.identify.mockResolvedValue(guardian);
    s.queries.guardianOwners.mockResolvedValue(['A', 'B', 'C']);
    await s.inbound.handle(event());
    expect(s.queries.guardianOwners).toHaveBeenCalledWith(GUARDIAN_ID);
    expect(s.push.notifySales).toHaveBeenCalledWith('new_message', expect.anything(), ['A', 'B', 'C']);
  });

  it('an unowned lead: owners [] (so every assistant)', async () => {
    const s = services();
    s.queries.identify.mockResolvedValue(knownLead);
    s.leads.upsertByPhone.mockResolvedValue(lead({ id: LEAD_ID, assigned_to: null }));
    await s.inbound.handle(event());
    expect(s.push.notifySales).toHaveBeenCalledWith('new_message', expect.anything(), []);
  });

  it('new_lead: owners [] with no lookup, even when auto-assign picked someone', async () => {
    const s = services();
    s.leads.upsertByPhone.mockResolvedValue(lead({ id: NEW_LEAD_ID, assigned_to: 'A' }));
    await s.inbound.handle(event());
    expect(s.push.notifySales).toHaveBeenCalledWith('new_lead', expect.objectContaining({ subject: NEW_LEAD_ID }), []);
    expect(s.queries.guardianOwners).not.toHaveBeenCalled();
  });

  it('a teacher: admins only, notifySales is not called', async () => {
    const s = services();
    s.queries.identify.mockResolvedValue({ ...nobody(), teacher: { id: 't1', name: 'أ. منى' } });
    await s.inbound.handle(event());
    expect(s.push.notifyAdmins).toHaveBeenCalled();
    expect(s.push.notifySales).not.toHaveBeenCalled();
  });

  it('a lookup that throws: handle resolves, the admins are notified, the assistants are not', async () => {
    const s = services();
    s.queries.identify.mockResolvedValue(guardian);
    s.queries.guardianOwners.mockRejectedValue(new Error('db down'));
    await expect(s.inbound.handle(event())).resolves.toBeUndefined();
    expect(s.push.notifyAdmins).toHaveBeenCalled();
    expect(s.push.notifySales).not.toHaveBeenCalled();
    expect(s.queries.stored).toHaveLength(1);
  });

  it('a replayed wamid: neither push', async () => {
    const s = services();
    await s.inbound.handle(event());
    s.push.notifyAdmins.mockClear();
    s.push.notifySales.mockClear();
    await s.inbound.handle(event());
    expect(s.push.notifyAdmins).not.toHaveBeenCalled();
    expect(s.push.notifySales).not.toHaveBeenCalled();
  });
});
