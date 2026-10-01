import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../common/audit/audit.service';
import { fakeDb, type FakeResult } from '../guardians/fake-db';
import { GuardiansService } from '../guardians/guardians.service';
import { StudentsService } from './students.service';

const S = { id: 's1', name: 'سهيلة', status: 'trial' };

function setup(results: Record<string, FakeResult[]>) {
  const fake = fakeDb(results);
  const record = vi.fn();
  const audit = { record } as unknown as AuditService;
  return { ...fake, record, svc: new StudentsService(fake.db, new GuardiansService(fake.db), audit) };
}

describe('StudentsService.update (R-STU-05, R-NFR-03)', () => {
  it('saves profile fields; no audit when status is unchanged', async () => {
    const { svc, argsOf, record } = setup({ students: [{ data: S }, { data: { ...S, level: 'جزء عم' } }] });
    await svc.update('s1', { level: 'جزء عم', status: 'trial' }, 'u1');
    expect(argsOf('students', 'update')).toEqual([{ level: 'جزء عم', status: 'trial' }]);
    expect(record).not.toHaveBeenCalled();
  });

  it('a status change writes an audit row with before/after', async () => {
    const { svc, record } = setup({ students: [{ data: S }, { data: { ...S, status: 'active' } }] });
    await svc.update('s1', { status: 'active' }, 'u1');
    expect(record).toHaveBeenCalledWith({
      actorId: 'u1',
      entity: 'students',
      entityId: 's1',
      action: 'status_change',
      before: { status: 'trial' },
      after: { status: 'active' },
    });
  });

  it('renaming renormalises name_normalized', async () => {
    const { svc, argsOf } = setup({ students: [{ data: S }, { data: S }] });
    await svc.update('s1', { name: 'سُهيلة' }, 'u1');
    expect(argsOf('students', 'update')).toEqual([{ name: 'سُهيلة', name_normalized: 'سهيله' }]);
  });

  it('404 for an unknown student', async () => {
    const { svc } = setup({ students: [{ data: null }] });
    await expect(svc.update('nope', { level: 'x' }, 'u1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('StudentsService.remove', () => {
  it('deletes and keeps an audit copy of the row', async () => {
    const { svc, record } = setup({ students: [{ data: [S] }] });
    await svc.remove('s1', 'u1');
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ action: 'delete', before: S }));
  });

  it('409 student_in_use when referenced, 404 when missing', async () => {
    const { svc } = setup({ students: [{ error: { code: '23503', message: 'fk' } }, { data: [] }] });
    await expect(svc.remove('s1', 'u1')).rejects.toThrow(new ConflictException('student_in_use'));
    await expect(svc.remove('s1', 'u1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
