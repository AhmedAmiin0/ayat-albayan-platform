import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../common/audit/audit.service';
import type { PermissionResolver } from '../../common/auth/permission-resolver';
import type { RoleRow } from './roles.mapper';
import type { RolesQueries } from './roles.queries';
import { RolesService } from './roles.service';

const ROLE: RoleRow = {
  id: 'r1', key: 'clerk', name_ar: 'محاسب', name_en: 'Clerk', base_role: 'admin',
  is_system: false, created_at: '', updated_at: '',
};
const ADMIN: RoleRow = { ...ROLE, id: 'sys', key: 'admin', is_system: true };

function setup(over: { roles?: RoleRow[]; perms?: Record<string, string[]>; counts?: Record<string, number> } = {}) {
  const roles = over.roles ?? [ROLE, ADMIN];
  const q = {
    roles: vi.fn(async () => roles),
    role: vi.fn(async (id: string) => roles.find((r) => r.id === id) ?? null),
    permissions: vi.fn(async () => new Map(Object.entries(over.perms ?? { r1: ['leads.view'], sys: ['*'] }))),
    userCounts: vi.fn(async () => new Map(Object.entries(over.counts ?? {}))),
    insert: vi.fn(async (r: Partial<RoleRow>) => ({ ...ROLE, ...r, id: 'new' })),
    update: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
    setPermissions: vi.fn(async () => undefined),
  };
  const audit = { record: vi.fn(async () => undefined) };
  const resolver = { invalidate: vi.fn(), resolve: vi.fn(async () => ({ roleKey: 'admin', permissions: new Set(['*']) })) };
  const svc = new RolesService(q as unknown as RolesQueries, audit as unknown as AuditService, resolver as unknown as PermissionResolver);
  return { svc, q, audit, resolver };
}

const valid = { key: 'auditor', name_ar: 'مراجع', name_en: 'Auditor', base_role: 'admin', permissions: ['payments.view'] };

describe('RolesService validation', () => {
  it.each([
    ['unknown permission', { ...valid, permissions: ['payments.delete'] }],
    ['bad key', { ...valid, key: 'Bad Key' }],
    ['no names', { key: 'auditor', base_role: 'admin' }],
    ['not an object', 'x'],
  ])('create rejects %s with 400 and writes nothing', async (_l, body) => {
    const { svc, q } = setup();
    await expect(svc.create(body, 'u')).rejects.toBeInstanceOf(BadRequestException);
    expect(q.insert).not.toHaveBeenCalled();
  });

  it('update validates what is sent', async () => {
    const { svc } = setup();
    await expect(svc.update('r1', { permissions: ['nope'] }, 'u')).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('RolesService', () => {
  it('lists roles with permissions and user counts', async () => {
    const { svc } = setup({ counts: { r1: 3 } });
    const list = await svc.list();
    expect(list.map((r) => [r.key, r.user_count, r.permissions])).toEqual([['clerk', 3, ['leads.view']], ['admin', 0, ['*']]]);
  });

  it('get answers 404 for an unknown id', async () => {
    await expect(setup().svc.get('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create inserts a custom role with its permissions and audits it', async () => {
    const { svc, q, audit } = setup();
    const view = await svc.create(valid, 'actor');
    expect(q.insert).toHaveBeenCalledWith({ key: 'auditor', name_ar: 'مراجع', name_en: 'Auditor', base_role: 'admin' });
    expect(q.setPermissions).toHaveBeenCalledWith('new', ['payments.view']);
    expect(view).toMatchObject({ id: 'new', is_system: false, user_count: 0 });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'actor', entity: 'roles', action: 'role_create' }));
  });

  it('create rolls the role back when its permissions cannot be written', async () => {
    const { svc, q } = setup();
    q.setPermissions.mockRejectedValueOnce(new Error('boom'));
    await expect(svc.create(valid, 'u')).rejects.toThrow('boom');
    expect(q.remove).toHaveBeenCalledWith('new');
  });

  it('update replaces the permission set in one call, drops the cache and audits', async () => {
    const { svc, q, resolver, audit } = setup();
    await svc.update('r1', { name_en: 'Accountant', permissions: ['payments.view'] }, 'u');
    expect(q.update).toHaveBeenCalledWith('r1', { name_en: 'Accountant' });
    expect(q.setPermissions).toHaveBeenCalledWith('r1', ['payments.view']);
    expect(resolver.invalidate).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'role_update' }));
  });

  it('update leaves permissions alone when none are sent', async () => {
    const { svc, q } = setup();
    await svc.update('r1', { name_ar: 'جديد' }, 'u');
    expect(q.setPermissions).not.toHaveBeenCalled();
  });

  it('update drops the cache even when the write fails', async () => {
    const { svc, q, resolver } = setup();
    q.setPermissions.mockRejectedValueOnce(new Error('boom'));
    await expect(svc.update('r1', { permissions: ['payments.view'] }, 'u')).rejects.toThrow('boom');
    expect(resolver.invalidate).toHaveBeenCalled();
  });

  it('the admin system role cannot lose the wildcard or change key', async () => {
    const { svc, q } = setup();
    await expect(svc.update('sys', { permissions: ['leads.view'] }, 'u')).rejects.toBeInstanceOf(ConflictException);
    await expect(svc.update('sys', { key: 'boss' }, 'u')).rejects.toBeInstanceOf(ConflictException);
    expect(q.update).not.toHaveBeenCalled();
    expect(q.setPermissions).not.toHaveBeenCalled();
  });

  it('delete: a role with users is 409 with the count', async () => {
    const { svc, q } = setup({ counts: { r1: 2 } });
    const err = await svc.remove('r1', 'u').catch((e: ConflictException) => e);
    expect((err as ConflictException).getResponse()).toEqual({ message: 'role_has_users', count: 2 });
    expect(q.remove).not.toHaveBeenCalled();
  });

  it('delete: system roles are refused, an empty custom role is removed and audited', async () => {
    const { svc, q, audit, resolver } = setup();
    await expect(svc.remove('sys', 'u')).rejects.toBeInstanceOf(ConflictException);
    await svc.remove('r1', 'u');
    expect(q.remove).toHaveBeenCalledWith('r1');
    expect(resolver.invalidate).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'role_delete', entityId: 'r1' }));
  });

  it('duplicate copies base role and permissions under a free key', async () => {
    const { svc, q } = setup({ roles: [ROLE, { ...ROLE, id: 'r2', key: 'clerk_copy' }] });
    await svc.duplicate('r1', undefined, 'u');
    expect(q.insert).toHaveBeenCalledWith({ key: 'clerk_copy2', name_ar: 'محاسب (نسخة)', name_en: 'Clerk (copy)', base_role: 'admin' });
    expect(q.setPermissions).toHaveBeenCalledWith('new', ['leads.view']);
  });

  it('duplicate accepts new names and a key, and works on a system role without the wildcard', async () => {
    const { svc, q } = setup({ perms: { r1: ['leads.view'], sys: ['leads.view'] } });
    await svc.duplicate('sys', { key: 'super', name_ar: 'مدير مساعد', name_en: 'Deputy' }, 'u');
    expect(q.insert).toHaveBeenCalledWith({ key: 'super', name_ar: 'مدير مساعد', name_en: 'Deputy', base_role: 'admin' });
  });
});
