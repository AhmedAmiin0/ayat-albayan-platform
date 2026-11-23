import { describe, expect, it } from 'vitest';
import type { Db } from '@/common/db/db.module';
import { fakeDb } from '@/common/db/testing/fake-db';
import { PortalGuardianRepo } from './portal-guardian.repo';

describe('PortalGuardianRepo.ownOf', () => {
  it('reads only the name and number, by the caller profile id', async () => {
    const f = fakeDb({ guardians: [{ data: { name: 'أحمد', phone_e164: '+201001234567' } }] });
    const out = await new PortalGuardianRepo(f.db).ownOf('g-a');
    expect(out).toEqual({ name: 'أحمد', phone: '+201001234567' });
    expect(f.argsOf('guardians', 'select')).toEqual(['name, phone_e164']);
    expect(f.argsOf('guardians', 'eq')).toEqual(['profile_id', 'g-a']);
  });

  it('is null without a guardian row or on a failed read', async () => {
    const none = fakeDb({ guardians: [{ data: null }] });
    expect(await new PortalGuardianRepo(none.db).ownOf('s-1')).toBeNull();
    const failed = fakeDb({ guardians: [{ error: { message: 'down' } }] });
    expect(await new PortalGuardianRepo(failed.db).ownOf('g-a')).toBeNull();
  });

  it('is null when the database client throws', async () => {
    const boom = (): never => {
      throw new Error('boom');
    };
    const db = { from: boom } as unknown as Db;
    expect(await new PortalGuardianRepo(db).ownOf('g-a')).toBeNull();
  });
});
