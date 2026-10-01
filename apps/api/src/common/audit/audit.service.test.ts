import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../db/db.module';
import { AuditService } from './audit.service';

function fakeDb(error: { message: string } | null) {
  const insert = vi.fn().mockResolvedValue({ error });
  const from = vi.fn().mockReturnValue({ insert });
  return { db: { from } as unknown as Db, from, insert };
}

describe('AuditService (R-NFR-03)', () => {
  it('writes one audit_log row mapped to DB columns', async () => {
    const { db, from, insert } = fakeDb(null);
    await new AuditService(db).record({
      actorId: 'u1',
      entity: 'students',
      entityId: 's1',
      action: 'merge',
      before: { name: 'سهيله' },
    });
    expect(from).toHaveBeenCalledWith('audit_log');
    expect(insert).toHaveBeenCalledWith({
      actor_id: 'u1',
      entity: 'students',
      entity_id: 's1',
      action: 'merge',
      before: { name: 'سهيله' },
      after: null,
    });
  });

  it('throws when the insert fails so callers never lose an audit row silently', async () => {
    const { db } = fakeDb({ message: 'boom' });
    const entry = { actorId: null, entity: 'leads', entityId: 'l1', action: 'status_change' };
    await expect(new AuditService(db).record(entry)).rejects.toThrow(/boom/);
  });
});
