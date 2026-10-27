import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../../common/audit/audit.service';
import { fakeDb, type FakeResult } from '../guardians/fake-db';
import { GuardiansService } from '../guardians/guardians.service';
import { studentCreateRequestSchema, studentPatchSchema } from './students.dto';
import { StudentsService } from './students.service';

// «رقم الواتساب لـ: ولي الأمر / الطالب نفسه» (docs/30 §1): POST and PATCH /students save contact_is_self.

const S = { id: 's1', name: 'سهيلة', status: 'trial' };

function setup(results: Record<string, FakeResult[]>) {
  const fake = fakeDb(results);
  const audit = { record: vi.fn() } as unknown as AuditService;
  return { ...fake, svc: new StudentsService(fake.db, new GuardiansService(fake.db), audit) };
}

describe('StudentsService: contact_is_self', () => {
  it('create inserts it', async () => {
    const dto = studentCreateRequestSchema.parse({
      guardian_id: '00000000-0000-4000-8000-000000000001',
      name: 'سهيلة',
      tz: 'Asia/Riyadh',
      force: true,
      contact_is_self: true,
    });
    const { svc, argsOf } = setup({ students: [{ data: S }] });
    await svc.create(dto, 'u1');
    expect(argsOf('students', 'insert')).toEqual([expect.objectContaining({ contact_is_self: true })]);
  });

  it('create without it leaves it to the DB default (false)', () => {
    const dto = studentCreateRequestSchema.parse({ guardian_id: '00000000-0000-4000-8000-000000000001', name: 'x', tz: 'UTC' });
    expect(dto).not.toHaveProperty('contact_is_self');
  });

  it('PATCH accepts it and update writes it alone', async () => {
    const dto = studentPatchSchema.parse({ contact_is_self: false });
    expect(dto).toEqual({ contact_is_self: false });
    const { svc, argsOf } = setup({ students: [{ data: S }, { data: { ...S, contact_is_self: false } }] });
    await svc.update('s1', dto, 'u1');
    expect(argsOf('students', 'update')).toEqual([{ contact_is_self: false }]);
  });

  it('PATCH rejects a non-boolean', () => {
    expect(studentPatchSchema.safeParse({ contact_is_self: 'yes' }).success).toBe(false);
  });
});
