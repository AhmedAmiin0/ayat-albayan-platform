import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../../common/audit/audit.service';
import { fakeDb, type FakeResult } from '../guardians/fake-db';
import { GuardiansService } from '../guardians/guardians.service';
import type { StudentCreateRequest } from './students.dto';
import { StudentsService } from './students.service';

const G = { id: 'g1', name: 'ام جود', phone_e164: '+966501234567' };
const NEW = { id: 's2', code: 'AB-0184', name: 'جود' };
const LEAD = '0b9f5c1e-3c51-4a59-9b1e-7d8c2f0a1b2c';
const BODY: StudentCreateRequest = {
  name: 'جود',
  tz: 'Asia/Riyadh',
  program: 'quran',
  status: 'trial',
  force: true,
  lead_id: LEAD,
  guardian: { name: 'ام جود', phone_e164: '+966501234567', tz: 'Asia/Riyadh' },
};

function setup(results: Record<string, FakeResult[]>) {
  const fake = fakeDb(results);
  const audit = { record: vi.fn() };
  const svc = new StudentsService(fake.db, new GuardiansService(fake.db), audit as unknown as AuditService);
  return { ...fake, audit, svc };
}

describe('StudentsService.create with lead_id (R-LEAD-06)', () => {
  it('creates the student, then converts the lead and links it to the guardian', async () => {
    const t = setup({
      leads: [{ data: { id: LEAD, status: 'new', converted_guardian_id: null } }, { data: { id: LEAD } }],
      guardians: [{ data: G }],
      students: [{ data: NEW }],
    });
    await expect(t.svc.create(BODY, 'u1')).resolves.toEqual(NEW);
    expect(t.argsOf('students', 'insert')).toEqual([expect.not.objectContaining({ lead_id: LEAD })]);
    expect(t.argsOf('leads', 'update')).toEqual([{ status: 'converted', converted_guardian_id: 'g1' }]);
    expect(t.audit.record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'leads', entityId: LEAD }));
  });

  it('an unknown lead is refused before anything is written', async () => {
    const t = setup({ leads: [{ data: null }] });
    await expect(t.svc.create(BODY, 'u1')).rejects.toBeInstanceOf(NotFoundException);
    expect(t.calls.some((c) => c.method === 'insert' || c.method === 'update')).toBe(false);
  });

  it('without lead_id no lead is read or touched', async () => {
    const t = setup({ guardians: [{ data: G }], students: [{ data: NEW }] });
    await t.svc.create({ ...BODY, lead_id: undefined }, 'u1');
    expect(t.calls.some((c) => c.table === 'leads')).toBe(false);
  });
});
