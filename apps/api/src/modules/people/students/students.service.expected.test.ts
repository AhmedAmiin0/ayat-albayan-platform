import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../../common/audit/audit.service';
import { fakeDb, type FakeResult } from '../guardians/fake-db';
import { GuardiansService } from '../guardians/guardians.service';
import { StudentsService } from './students.service';

const S = { id: 's1', name: 'سهيلة', status: 'active' };

function setup(results: Record<string, FakeResult[]>) {
  const fake = fakeDb(results);
  const record = vi.fn();
  const audit = { record } as unknown as AuditService;
  return { ...fake, record, svc: new StudentsService(fake.db, new GuardiansService(fake.db), audit) };
}

const eqsOn = (calls: { table: string; method: string; args: unknown[] }[]) =>
  calls.filter((c) => c.table === 'students' && c.method === 'eq').map((c) => c.args);

describe('StudentsService.update expected_status (R-STU-05)', () => {
  it('compare-and-set: filters the update on the expected status and audits from it', async () => {
    const { svc, calls, argsOf, record } = setup({ students: [{ data: S }, { data: { ...S, status: 'paused' } }] });
    await svc.update('s1', { status: 'paused', expected_status: 'active' }, 'u1');
    expect(argsOf('students', 'update')).toEqual([{ status: 'paused' }]);
    expect(eqsOn(calls)).toEqual([['id', 's1'], ['id', 's1'], ['status', 'active']]);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ before: { status: 'active' }, after: { status: 'paused' } }),
    );
  });

  it('409 status_changed and no audit row when the status moved meanwhile', async () => {
    const { svc, record } = setup({ students: [{ data: { ...S, status: 'pending_renewal' } }, { data: null }] });
    const call = svc.update('s1', { status: 'paused', expected_status: 'active' }, 'u1');
    await expect(call).rejects.toBeInstanceOf(ConflictException);
    await expect(call).rejects.toMatchObject({ response: { code: 'status_changed', message: 'status_changed' } });
    expect(record).not.toHaveBeenCalled();
  });

  it('without expected_status the status is not filtered on', async () => {
    const { svc, calls } = setup({ students: [{ data: S }, { data: S }] });
    await svc.update('s1', { level: 'جزء عم' }, 'u1');
    expect(eqsOn(calls)).toEqual([['id', 's1'], ['id', 's1']]);
  });

  it('404 when the row vanished between the read and the write', async () => {
    const { svc, record } = setup({ students: [{ data: S }, { data: null }] });
    await expect(svc.update('s1', { level: 'x' }, 'u1')).rejects.toBeInstanceOf(NotFoundException);
    expect(record).not.toHaveBeenCalled();
  });
});
