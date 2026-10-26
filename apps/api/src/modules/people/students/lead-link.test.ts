import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../../common/audit/audit.service';
import { fakeDb, type FakeResult } from '../guardians/fake-db';
import { LeadLink, type LinkedLead } from './lead-link';

function setup(leads: FakeResult[]) {
  const t = fakeDb({ leads });
  const audit = { record: vi.fn() };
  return { ...t, audit, link: new LeadLink(t.db, audit as unknown as AuditService) };
}
const lead = (patch: Partial<LinkedLead> = {}): LinkedLead => ({
  id: 'l1',
  status: 'new',
  converted_guardian_id: null,
  ...patch,
});
const eqs = (t: ReturnType<typeof setup>) =>
  t.calls.filter((c) => c.table === 'leads' && c.method === 'eq').map((c) => c.args);

describe('LeadLink (R-LEAD-06): «تسجيل الطالب» converts the thread’s lead', () => {
  it('find: the lead row, or 404 lead_not_found', async () => {
    const t = setup([{ data: lead() }, { data: null }]);
    await expect(t.link.find('l1')).resolves.toEqual(lead());
    await expect(t.link.find('l2')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('an open lead → converted and linked (CAS on the status), audited', async () => {
    const t = setup([{ data: { id: 'l1' } }]);
    await t.link.convert({ lead: lead({ status: 'contacted' }), guardianId: 'g1', actorId: 'u1' });
    expect(t.argsOf('leads', 'update')).toEqual([{ status: 'converted', converted_guardian_id: 'g1' }]);
    expect(eqs(t)).toEqual([
      ['id', 'l1'],
      ['status', 'contacted'],
    ]);
    expect(t.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'leads',
        entityId: 'l1',
        before: { status: 'contacted' },
        after: { status: 'converted', via: 'registration' },
      }),
    );
  });

  it('keeps an earlier family link', async () => {
    const t = setup([{ data: { id: 'l1' } }]);
    await t.link.convert({ lead: lead({ converted_guardian_id: 'g0' }), guardianId: 'g1', actorId: 'u1' });
    expect(t.argsOf('leads', 'update')).toEqual([{ status: 'converted', converted_guardian_id: 'g0' }]);
  });

  it('the status changed meanwhile (CAS lost) → no audit', async () => {
    const t = setup([{ data: null }]);
    await t.link.convert({ lead: lead(), guardianId: 'g1', actorId: 'u1' });
    expect(t.audit.record).not.toHaveBeenCalled();
  });

  it('already converted, unlinked → only the link, no status move or audit', async () => {
    const t = setup([{ data: null }]);
    await t.link.convert({ lead: lead({ status: 'converted' }), guardianId: 'g1', actorId: 'u1' });
    expect(t.argsOf('leads', 'update')).toEqual([{ converted_guardian_id: 'g1' }]);
    expect(t.argsOf('leads', 'is')).toEqual(['converted_guardian_id', null]);
    expect(t.audit.record).not.toHaveBeenCalled();
  });

  it('already converted and linked → nothing written', async () => {
    const t = setup([]);
    await t.link.convert({
      lead: lead({ status: 'converted', converted_guardian_id: 'g0' }),
      guardianId: 'g1',
      actorId: 'u1',
    });
    expect(t.calls).toEqual([]);
  });
});
