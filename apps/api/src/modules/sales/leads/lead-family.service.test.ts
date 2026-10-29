import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../../common/audit/audit.service';
import { errorCode } from '../../../common/http/errors';
import { fakeDb, type FakeResult } from '../../people/guardians/fake-db';
import { LeadFamilyService } from './lead-family.service';

const PHONE = '+966552220000';
const lead = (status = 'contacted') => ({ id: 'l1', status, phone_e164: PHONE });
const INPUT = { leadId: 'l1', code: 'AB-0183', actorId: 'u1' };

function setup(results: Record<string, FakeResult[]>) {
  const f = fakeDb({ students: [{ data: { guardian_id: 'g1' } }], ...results });
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  return { ...f, audit, svc: new LeadFamilyService(f.db, audit as unknown as AuditService) };
}

async function failure(p: Promise<unknown>): Promise<[number, string | undefined]> {
  const e: unknown = await p.then(() => null, (err: unknown) => err);
  return e instanceof HttpException ? [e.getStatus(), errorCode(e)] : [0, String(e)];
}

const writes = (calls: { table: string; method: string }[]) =>
  calls.filter((c) => ['insert', 'update', 'delete', 'upsert'].includes(c.method)).map((c) => `${c.table}.${c.method}`);

describe('LeadFamilyService.link «ربط بطالب موجود»', () => {
  it('a new link: inserts the second number, audits phone_linked, converts the lead (CAS) and audits that', async () => {
    const t = setup({ leads: [{ data: lead() }, { data: { id: 'l1' } }], guardian_phones: [{ data: null }, {}] });
    expect(await t.svc.link(INPUT)).toEqual({ linked: true });
    expect(t.argsOf('guardian_phones', 'insert')).toEqual([{ phone_e164: PHONE, guardian_id: 'g1', is_primary: false, created_by: 'u1' }]);
    expect(t.argsOf('students', 'eq')).toEqual(['code', 'AB-0183']);
    expect(t.audit.record).toHaveBeenCalledWith({
      actorId: 'u1', entity: 'guardians', entityId: 'g1', action: 'phone_linked', after: { phone_e164: PHONE, lead_id: 'l1', student_code: 'AB-0183' },
    });
    expect(t.argsOf('leads', 'update')).toEqual([{ status: 'converted' }]);
    const casEq = t.calls.filter((c) => c.table === 'leads' && c.method === 'eq').map((c) => c.args);
    expect(casEq).toEqual(expect.arrayContaining([['status', 'contacted']]));
    expect(t.audit.record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'leads', action: 'status_change', after: { status: 'converted', via: 'link_family' } }));
  });

  it('never touches converted_guardian_id or assigned_to (linking makes nobody an owner)', async () => {
    const t = setup({ leads: [{ data: lead('new') }, { data: { id: 'l1' } }], guardian_phones: [{ data: null }, {}] });
    await t.svc.link(INPUT);
    const update = t.argsOf('leads', 'update')?.[0] as Record<string, unknown>;
    expect(Object.keys(update)).toEqual(['status']);
  });

  it('a repeat for the same family → linked: false, nothing written again, an already converted lead stays', async () => {
    const t = setup({ leads: [{ data: lead('converted') }], guardian_phones: [{ data: { guardian_id: 'g1', is_primary: false } }] });
    expect(await t.svc.link(INPUT)).toEqual({ linked: false });
    expect(writes(t.calls)).toEqual([]);
    expect(t.audit.record).not.toHaveBeenCalled();
  });

  it('the lead’s number already is the family’s MAIN number → linked: false, the lead is still converted', async () => {
    const t = setup({ leads: [{ data: lead('new') }, { data: { id: 'l1' } }], guardian_phones: [{ data: { guardian_id: 'g1', is_primary: true } }] });
    expect(await t.svc.link(INPUT)).toEqual({ linked: false });
    expect(writes(t.calls)).toEqual(['leads.update']);
  });

  it('another family’s number → 409 number_taken (a second one) or lead_has_family (its main one), nothing written', async () => {
    for (const [is_primary, code] of [[false, 'number_taken'], [true, 'lead_has_family']] as const) {
      const t = setup({ leads: [{ data: lead() }], guardian_phones: [{ data: { guardian_id: 'g2', is_primary } }] });
      expect(await failure(t.svc.link(INPUT))).toEqual([409, code]);
      expect(writes(t.calls)).toEqual([]);
    }
  });

  it('the database answers: 409 family_has_second_number, 409 teacher_number; the lead is not converted', async () => {
    const cases = [
      [{ code: '23505', message: 'duplicate key value violates unique constraint "guardian_phones_one_second"' }, 'family_has_second_number'],
      [{ code: 'P0001', message: 'teacher_number' }, 'teacher_number'],
    ] as const;
    for (const [error, code] of cases) {
      const t = setup({ leads: [{ data: lead() }], guardian_phones: [{ data: null }, { error }] });
      expect(await failure(t.svc.link(INPUT))).toEqual([409, code]);
      expect(writes(t.calls)).toEqual(['guardian_phones.insert']);
      expect(t.audit.record).not.toHaveBeenCalled();
    }
  });

  it('a lost race on the number reads it again: this family → linked: false; another → 409 number_taken', async () => {
    const pkey = { code: '23505', message: 'duplicate key value violates unique constraint "guardian_phones_pkey"' };
    const same = setup({ leads: [{ data: lead('converted') }], guardian_phones: [{ data: null }, { error: pkey }, { data: { guardian_id: 'g1', is_primary: false } }] });
    expect(await same.svc.link(INPUT)).toEqual({ linked: false });
    const other = setup({ leads: [{ data: lead() }], guardian_phones: [{ data: null }, { error: pkey }, { data: { guardian_id: 'g2', is_primary: false } }] });
    expect(await failure(other.svc.link(INPUT))).toEqual([409, 'number_taken']);
  });

  it('a concurrent status move wins: no status audit', async () => {
    const t = setup({ leads: [{ data: lead() }, { data: null }], guardian_phones: [{ data: null }, {}] });
    expect(await t.svc.link(INPUT)).toEqual({ linked: true });
    expect(t.audit.record).toHaveBeenCalledTimes(1);
    expect(t.audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'phone_linked' }));
  });

  it('404 lead_not_found / student_not_found before any write', async () => {
    const noLead = setup({ leads: [{ data: null }] });
    expect(await failure(noLead.svc.link(INPUT))).toEqual([404, 'lead_not_found']);
    const noStudent = setup({ leads: [{ data: lead() }], students: [{ data: null }] });
    expect(await failure(noStudent.svc.link(INPUT))).toEqual([404, 'student_not_found']);
    expect([...writes(noLead.calls), ...writes(noStudent.calls)]).toEqual([]);
  });
});
