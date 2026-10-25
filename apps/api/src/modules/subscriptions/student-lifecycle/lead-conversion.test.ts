import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../../common/audit/audit.service';
import { fakeDb, type FakeResult } from '../../guardians/fake-db';
import { LeadConversion } from './lead-conversion';

const GUARDIAN = { id: 'g1', phone_e164: '+966501234567' };

function setup(leads: FakeResult[]) {
  const t = fakeDb({ students: [{ data: { guardian: GUARDIAN } }], leads });
  const audit = { record: vi.fn() };
  return { ...t, audit, convert: new LeadConversion(t.db, audit as unknown as AuditService) };
}

describe('LeadConversion (R-LEAD-01): a package from the chat converts the family’s lead', () => {
  it('a trial_booked lead on the guardian’s phone → converted (CAS), linked and audited', async () => {
    const t = setup([{ data: [{ id: 'l1', status: 'trial_booked', converted_guardian_id: null }] }, { data: { id: 'l1' } }]);
    await t.convert.afterPackage('s1', 'admin1');
    expect(t.argsOf('leads', 'or')).toEqual(['converted_guardian_id.eq.g1,phone_e164.eq."+966501234567"']);
    expect(t.argsOf('leads', 'update')).toEqual([{ status: 'converted', converted_guardian_id: 'g1' }]);
    expect(t.calls.filter((c) => c.table === 'leads' && c.method === 'eq').map((c) => c.args)).toEqual([
      ['id', 'l1'],
      ['status', 'trial_booked'],
    ]);
    expect(t.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ entity: 'leads', entityId: 'l1', action: 'status_change', before: { status: 'trial_booked' } }),
    );
  });

  it('already converted (terminal) → nothing written', async () => {
    const t = setup([{ data: [{ id: 'l1', status: 'converted', converted_guardian_id: 'g1' }] }]);
    await t.convert.afterPackage('s1', 'admin1');
    expect(t.argsOf('leads', 'update')).toBeUndefined();
    expect(t.audit.record).not.toHaveBeenCalled();
  });

  it('the status changed meanwhile (CAS lost) → no audit', async () => {
    const t = setup([{ data: [{ id: 'l1', status: 'trial_done', converted_guardian_id: null }] }, { data: null }]);
    await t.convert.afterPackage('s1', 'admin1');
    expect(t.audit.record).not.toHaveBeenCalled();
  });

  it('no lead for the family (a guardian added by hand) → nothing', async () => {
    const t = setup([{ data: [] }]);
    await t.convert.afterPackage('s1', 'admin1');
    expect(t.argsOf('leads', 'update')).toBeUndefined();
  });
});
