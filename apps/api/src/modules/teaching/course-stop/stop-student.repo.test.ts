import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '@/common/audit/audit.service';
import type { Db } from '@/common/db/db.module';
import { StopStudentRepo } from './stop-student.repo';

// The student's move to «توقف» after a stop: compare-and-set, audited only when it changed a row.
function setup(input: { status: string; updated: boolean }) {
  const read = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(async () => ({ data: { status: input.status }, error: null })),
  };
  read.select.mockReturnValue(read);
  read.eq.mockReturnValue(read);
  const write: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const k of ['update', 'eq', 'select']) write[k] = vi.fn(() => write);
  write.maybeSingle = vi.fn(async () => ({
    data: input.updated ? { id: 'st1' } : null,
    error: null,
  }));
  const from = vi.fn().mockReturnValueOnce(read).mockReturnValueOnce(write);
  const audit = { record: vi.fn() };
  const repo = new StopStudentRepo({ from } as unknown as Db, audit as unknown as AuditService);
  return { repo, write, audit };
}
const CHURN = { studentId: 'st1', subscriptionId: 's1', actorId: 'a1' };

describe('StopStudentRepo.churn', () => {
  it('active → churned, compare-and-set on the read status, one status_change audit row', async () => {
    const { repo, write, audit } = setup({ status: 'active', updated: true });
    expect(await repo.churn(CHURN)).toBe('churned');
    expect(write.update).toHaveBeenCalledWith({ status: 'churned' });
    expect(write.eq).toHaveBeenCalledWith('status', 'active');
    expect(audit.record).toHaveBeenCalledWith({
      actorId: 'a1',
      entity: 'students',
      entityId: 'st1',
      action: 'status_change',
      before: { status: 'active' },
      after: {
        status: 'churned',
        from: 'active',
        reason: 'subscription_stopped',
        subscription_id: 's1',
      },
    });
  });

  it('already churned: no write, no audit', async () => {
    const { repo, write, audit } = setup({ status: 'churned', updated: false });
    expect(await repo.churn(CHURN)).toBe('churned');
    expect(write.update).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('moved meanwhile (the compare-and-set misses): the read status, no audit', async () => {
    const { repo, audit } = setup({ status: 'pending_renewal', updated: false });
    expect(await repo.churn(CHURN)).toBe('pending_renewal');
    expect(audit.record).not.toHaveBeenCalled();
  });
});
