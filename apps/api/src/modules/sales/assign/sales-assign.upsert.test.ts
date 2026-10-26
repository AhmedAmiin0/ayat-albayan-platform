import { ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { fakeDeps, lead } from '../../leads/leads.fakes';
import { LeadsService } from '../../leads/leads.service';
import type { SalesAssignService } from './sales-assign.service';
import { world } from './sales-assign.fakes';

/** The webhook path: LeadsService.upsertByPhone with the real SalesAssignService behind it. */
function setup(over: Parameters<typeof world>[0] = {}) {
  const w = world(over);
  const deps = fakeDeps();
  const service = new LeadsService(deps.asLeads, deps.asApplicants, deps.asAudit);
  Object.assign(service, { sales: w.service as SalesAssignService });
  deps.leads.insert.mockImplementation(async (row: object) => {
    const created = lead({ ...row, id: 'new-1' });
    w.leads.set(created.id, created);
    return created;
  });
  return { ...w, deps, service };
}
const contact = { phone: '+966501234567', at: new Date('2026-10-01T08:00:00Z') };

describe('auto-assign through LeadsService.upsertByPhone (the webhook)', () => {
  it('a NEW lead is assigned; the second message from it does not reassign', async () => {
    const t = setup();
    const first = await t.service.upsertByPhone(contact);
    expect(first?.assigned_to).toBe('a');
    t.deps.leads.findByPhone.mockResolvedValue(t.leads.get('new-1'));
    t.deps.leads.update.mockImplementation(async (id: string) => t.leads.get(id));
    t.q.setAssignee.mockClear();
    const second = await t.service.upsertByPhone({ ...contact, at: new Date('2026-10-02T08:00:00Z') });
    expect(second?.assigned_to).toBe('a');
    expect(t.q.setAssignee).not.toHaveBeenCalled();
    expect(t.q.salespeople).toHaveBeenCalledTimes(1);
  });

  it('a concurrent first message (insert lost the race) is not assigned here', async () => {
    const t = setup();
    t.deps.leads.insert.mockRejectedValue(new ConflictException());
    t.deps.leads.findByPhone.mockResolvedValueOnce(null).mockResolvedValueOnce(lead());
    t.deps.leads.update.mockResolvedValue(lead());
    await t.service.upsertByPhone(contact);
    expect(t.q.setAssignee).not.toHaveBeenCalled();
  });

  it('sales_auto_assign = false: the lead stays unassigned', async () => {
    const t = setup({ on: false });
    expect((await t.service.upsertByPhone(contact))?.assigned_to).toBeNull();
  });

  it('no salespeople: unassigned, and the webhook still succeeds', async () => {
    const t = setup({ sales: [] });
    expect((await t.service.upsertByPhone(contact))?.assigned_to).toBeNull();
  });

  it('a failing assignment never reaches the webhook', async () => {
    const t = setup();
    t.q.salespeople.mockRejectedValue(new Error('db down'));
    await expect(t.service.upsertByPhone(contact)).resolves.toMatchObject({ id: 'new-1', assigned_to: null });
  });
});
