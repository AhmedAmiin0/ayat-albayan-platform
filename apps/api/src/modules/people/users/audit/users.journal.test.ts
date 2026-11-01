import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '@/common/audit/audit.service';
import { PermissionCache } from '@/common/auth/permission.cache';
import { UserJournal } from './users.journal';

const setup = () => {
  const cache = new PermissionCache();
  const record = vi.fn().mockResolvedValue(undefined);
  const audit = { record } as unknown as AuditService;
  return { cache, record, journal: new UserJournal(cache, audit) };
};

describe('UserJournal', () => {
  it('forget clears the permission cache', () => {
    const { cache, journal } = setup();
    const clear = vi.spyOn(cache, 'clear');
    journal.forget();
    expect(clear).toHaveBeenCalledOnce();
  });

  it('record writes one users audit row with the extra fields only (no credential)', async () => {
    const { record, journal } = setup();
    const extra = { credential_mode: 'link' };
    await journal.record({ actorId: 'a1', userId: 'u1', action: 'reset_password', extra });
    expect(record).toHaveBeenCalledWith({
      actorId: 'a1',
      entity: 'users',
      entityId: 'u1',
      action: 'reset_password',
      before: null,
      after: extra,
    });
  });
});
