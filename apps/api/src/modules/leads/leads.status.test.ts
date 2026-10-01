import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { lead, LEAD_ID, leadsService } from './leads.fakes';

const ACTOR = 'admin-1';

describe('LeadsService.changeStatus (R-LEAD-01, R-NFR-03)', () => {
  it('moves an allowed transition with a compare-and-set and audits it', async () => {
    const { service, leads, audit } = leadsService();
    leads.findById.mockResolvedValue(lead({ status: 'new' }));
    leads.moveStatus.mockResolvedValue(lead({ status: 'contacted' }));
    const res = await service.changeStatus({ id: LEAD_ID, to: 'contacted', actorId: ACTOR });
    expect(res.status).toBe('contacted');
    expect(leads.moveStatus).toHaveBeenCalledWith({ id: LEAD_ID, from: 'new', to: 'contacted' });
    expect(audit.record).toHaveBeenCalledWith({
      actorId: ACTOR,
      entity: 'leads',
      entityId: LEAD_ID,
      action: 'status_change',
      before: { status: 'new' },
      after: { status: 'contacted' },
    });
  });

  it('rejects a transition the state machine forbids with 409 invalid_transition', async () => {
    const { service, leads, audit } = leadsService();
    leads.findById.mockResolvedValue(lead({ status: 'converted' }));
    const err = await service
      .changeStatus({ id: LEAD_ID, to: 'contacted', actorId: ACTOR })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ConflictException);
    expect((err as ConflictException).getResponse()).toMatchObject({ code: 'invalid_transition' });
    expect(leads.moveStatus).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('409s when the status changed concurrently (compare-and-set missed)', async () => {
    const { service, leads, audit } = leadsService();
    leads.findById.mockResolvedValue(lead({ status: 'new' }));
    leads.moveStatus.mockResolvedValue(null);
    await expect(
      service.changeStatus({ id: LEAD_ID, to: 'contacted', actorId: ACTOR }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('404s for an unknown lead', async () => {
    const { service, leads } = leadsService();
    leads.findById.mockResolvedValue(null);
    await expect(
      service.changeStatus({ id: LEAD_ID, to: 'contacted', actorId: ACTOR }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('list echoes paging around the query result', async () => {
    const { service, leads } = leadsService();
    leads.list.mockResolvedValue({ items: [lead()], total: 41 });
    const page = await service.list({ status: 'new', page: 2, pageSize: 20 });
    expect(page).toEqual({ items: [lead()], total: 41, page: 2, pageSize: 20 });
    expect(leads.list).toHaveBeenCalledWith({ status: 'new', page: 2, pageSize: 20 });
  });
});
