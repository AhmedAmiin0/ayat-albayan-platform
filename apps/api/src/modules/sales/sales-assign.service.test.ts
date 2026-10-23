import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { lead } from '../leads/leads.fakes';
import { world } from './sales-assign.fakes';

describe('SalesAssignService.autoAssign', () => {
  it('hands a new lead to the least loaded salesperson', async () => {
    const w = world({ leads: [lead({ id: 'l0', assigned_to: 'a' }), lead({ id: 'l1' })] });
    const out = await w.service.autoAssign(lead({ id: 'l1' }));
    expect(out.assigned_to).toBe('b');
    expect(w.q.setAssignee).toHaveBeenCalledWith({ leadId: 'l1', profileId: 'b', onlyIfFree: true });
  });

  it('sales_auto_assign = false: off, nothing read or written', async () => {
    const w = world({ on: false, leads: [lead({ id: 'l1' })] });
    expect((await w.service.autoAssign(lead({ id: 'l1' }))).assigned_to).toBeNull();
    expect(w.q.salespeople).not.toHaveBeenCalled();
    expect(w.q.setAssignee).not.toHaveBeenCalled();
  });

  it('no salespeople: assigned_to stays null', async () => {
    const w = world({ sales: [], leads: [lead({ id: 'l1' })] });
    expect((await w.service.autoAssign(lead({ id: 'l1' }))).assigned_to).toBeNull();
    expect(w.q.setAssignee).not.toHaveBeenCalled();
  });

  it('never reassigns a lead that already has an owner', async () => {
    const w = world({ leads: [lead({ id: 'l1', assigned_to: 'a' })] });
    expect((await w.service.autoAssign(lead({ id: 'l1', assigned_to: 'a' }))).assigned_to).toBe('a');
    expect(w.q.setAssignee).not.toHaveBeenCalled();
  });

  it('never throws: a failing read is swallowed and the lead comes back as it was', async () => {
    const w = world({ leads: [lead({ id: 'l1' })] });
    w.q.salespeople.mockRejectedValue(new Error('db down'));
    await expect(w.service.autoAssign(lead({ id: 'l1' }))).resolves.toEqual(lead({ id: 'l1' }));
    vi.spyOn(w.settings, 'read').mockRejectedValue(new Error('settings down'));
    await expect(w.service.autoAssign(lead({ id: 'l1' }))).resolves.toEqual(lead({ id: 'l1' }));
  });
});

describe('SalesAssignService admin actions', () => {
  const code = (e: unknown) => (e instanceof HttpException ? [e.getStatus(), (e.getResponse() as { code: string }).code] : e);

  it('assign: a salesperson, audited; null unassigns', async () => {
    const w = world({ leads: [lead({ id: 'l1' })] });
    expect((await w.service.assign({ leadId: 'l1', profileId: 'a', actorId: 'adm' })).assigned_to).toBe('a');
    expect(w.audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'assign', entityId: 'l1', after: { assigned_to: 'a' } }));
    expect((await w.service.assign({ leadId: 'l1', profileId: null, actorId: 'adm' })).assigned_to).toBeNull();
  });

  it('assign: 400 not_a_salesperson for any other profile, 404 for an unknown lead', async () => {
    const w = world({ leads: [lead({ id: 'l1' })] });
    expect(await w.service.assign({ leadId: 'l1', profileId: 'teacher-1', actorId: 'x' }).catch(code)).toEqual([400, 'not_a_salesperson']);
    expect(await w.service.assign({ leadId: 'nope', profileId: 'a', actorId: 'x' }).catch(code)).toEqual([404, 'lead_not_found']);
    expect(w.audit.record).not.toHaveBeenCalled();
  });

  it('assignUnassigned: every free lead one by one, balanced; nobody to give to = 0', async () => {
    const w = world({ leads: ['l1', 'l2', 'l3', 'l4'].map((id) => lead({ id })) });
    expect(await w.service.assignUnassigned()).toEqual({ assigned: 4 });
    const owners = [...w.leads.values()].map((l) => l.assigned_to);
    expect(owners.filter((o) => o === 'a')).toHaveLength(2);
    expect(owners.filter((o) => o === 'b')).toHaveLength(2);
    expect(await world({ sales: [], leads: [lead({ id: 'l1' })] }).service.assignUnassigned()).toEqual({ assigned: 0 });
  });

  it('list: salespeople with their open lead counts', async () => {
    const w = world({ leads: [lead({ id: 'l1', assigned_to: 'a' }), lead({ id: 'l2', assigned_to: 'a', status: 'lost' })] });
    expect(await w.service.list()).toEqual([{ id: 'a', name: 'أحمد', open_leads: 1 }, { id: 'b', name: 'بلال', open_leads: 0 }]);
  });
});
