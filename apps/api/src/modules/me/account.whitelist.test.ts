import { profileUpdateSchema } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { accountKit, ME, PASSWORD } from './account.fakes';
import { selfWritable, SELF_WRITABLE } from './account.ports';

// R-ACC-02 / rule 9: a user's own writes reach full_name, phone_e164 and avatar_path only.

const FORBIDDEN = ['role', 'role_id', 'disabled_at', 'disabled_by', 'disabled_reason', 'id', 'push_tokens'];

describe('account column whitelist', () => {
  it('lists only the three self-writable columns', () => {
    expect([...SELF_WRITABLE].sort()).toEqual(['avatar_path', 'full_name', 'phone_e164']);
  });

  it('selfWritable drops role, role_id and disabled_* whatever the input holds', () => {
    const input = { full_name: 'Huda', role: 'admin', role_id: 'r-1', disabled_at: null, disabled_by: null, disabled_reason: 'x', id: 'other' };
    expect(selfWritable(input)).toEqual({ full_name: 'Huda' });
  });

  it('a PATCH body with role / role_id is stripped by the schema and never stored', async () => {
    const kit = accountKit();
    const body = profileUpdateSchema.parse({ full_name: '  Huda Ali ', role: 'admin', role_id: null, disabled_at: null });
    await kit.account.updateProfile(ME, body);
    expect(kit.store.patches).toEqual([{ full_name: 'Huda Ali' }]);
    for (const key of FORBIDDEN) expect(kit.store.patches.some((p) => key in p)).toBe(false);
    expect((await kit.store.get(ME.id))?.role.base).toBe('teacher');
  });

  it('a body of only forbidden keys is an empty update (400)', () => {
    expect(profileUpdateSchema.safeParse({ role: 'admin' }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ role_id: null, disabled_at: null }).success).toBe(false);
  });

  it('even a caller passing extra keys to the service cannot write them', async () => {
    const kit = accountKit();
    const sneaky = { full_name: 'Huda', phone_e164: '+966501234567', current_password: PASSWORD, role: 'admin' };
    await kit.account.updateProfile(ME, sneaky);
    expect(kit.store.patches).toEqual([{ full_name: 'Huda', phone_e164: '+966501234567' }]);
  });

  it('never touches another profile: writes go to the caller id', async () => {
    const kit = accountKit();
    const role = { base: 'admin' as const, key: 'admin', name_ar: 'a', name_en: 'Admin' };
    kit.store.rows.set('user-2', { id: 'user-2', full_name: 'Other', phone_e164: null, avatar_path: null, role });
    await kit.account.updateProfile(ME, { full_name: 'Huda' });
    expect((await kit.store.get('user-2'))?.full_name).toBe('Other');
  });
});
