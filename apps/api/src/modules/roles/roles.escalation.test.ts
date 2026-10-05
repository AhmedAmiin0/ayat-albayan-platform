import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../common/audit/audit.service';
import type { PermissionResolver } from '../../common/auth/permission-resolver';
import type { RoleRow } from './roles.mapper';
import type { RolesQueries } from './roles.queries';
import { RolesService } from './roles.service';

const base = { name_ar: 'ا', name_en: 'A', base_role: 'admin', is_system: false, created_at: '', updated_at: '' } as const;
const CLERK: RoleRow = { ...base, id: 'r1', key: 'clerk' };
const OWN: RoleRow = { ...base, id: 'own', key: 'manager' };
const ADMIN: RoleRow = { ...base, id: 'sys', key: 'admin', is_system: true };
const PERMS: Record<string, string[]> = { r1: ['leads.view'], own: ['roles.manage'], sys: ['*'] };

type Actor = { roleKey: string | null; permissions: Set<string> };
const holder = (...p: string[]): Actor => ({ roleKey: 'manager', permissions: new Set(['roles.manage', ...p]) });
const ROOT: Actor = { roleKey: 'admin', permissions: new Set(['*']) };

function setup(actor: Actor) {
  const roles = [CLERK, OWN, ADMIN];
  const q = {
    roles: vi.fn(async () => roles),
    role: vi.fn(async (id: string) => roles.find((r) => r.id === id) ?? null),
    permissions: vi.fn(async () => new Map(Object.entries(PERMS))),
    userCounts: vi.fn(async () => new Map<string, number>()),
    insert: vi.fn(async (r: Partial<RoleRow>) => ({ ...CLERK, ...r, id: 'new' })),
    update: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
    setPermissions: vi.fn(async () => undefined),
  };
  const resolver = { invalidate: vi.fn(), resolve: vi.fn(async () => actor) };
  const audit = { record: vi.fn(async () => undefined) };
  const svc = new RolesService(q as unknown as RolesQueries, audit as unknown as AuditService, resolver as unknown as PermissionResolver);
  return { svc, q };
}

const valid = { key: 'auditor', name_ar: 'مراجع', name_en: 'Auditor', base_role: 'admin', permissions: ['payments.view'] };
const denied = (p: Promise<unknown>, message: string) =>
  expect(p).rejects.toMatchObject({ response: expect.objectContaining({ message }) });

describe('RolesService: the wildcard stays with the admin role', () => {
  it('create rejects it, even from a wildcard holder', async () => {
    const { svc, q } = setup(ROOT);
    await denied(svc.create({ ...valid, permissions: ['*'] }, 'u'), 'wildcard_reserved');
    expect(q.insert).not.toHaveBeenCalled();
  });

  it('update rejects it on a custom role; duplicating the admin role is rejected too', async () => {
    const { svc, q } = setup(ROOT);
    await denied(svc.update('r1', { permissions: ['*'] }, 'u'), 'wildcard_reserved');
    await denied(svc.duplicate('sys', undefined, 'u'), 'wildcard_reserved');
    expect(q.setPermissions).not.toHaveBeenCalled();
    expect(q.insert).not.toHaveBeenCalled();
  });

  it('the admin role itself may keep it in an update', async () => {
    const { svc, q } = setup(ROOT);
    await svc.update('sys', { name_en: 'Boss', permissions: ['*'] }, 'u');
    expect(q.setPermissions).toHaveBeenCalledWith('sys', ['*']);
  });
});

describe('RolesService: nobody grants what they do not hold', () => {
  it('create refuses a permission the actor lacks and writes nothing', async () => {
    const { svc, q } = setup(holder('leads.view'));
    const err = await svc.create({ ...valid, permissions: ['leads.view', 'payments.manage'] }, 'u').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ForbiddenException);
    expect((err as ForbiddenException).getResponse()).toMatchObject({ message: 'permission_not_held', permissions: ['payments.manage'] });
    expect(q.insert).not.toHaveBeenCalled();
  });

  it('create accepts what the actor holds (manage covers view)', async () => {
    const { svc, q } = setup(holder('payments.manage'));
    await svc.create({ ...valid, permissions: ['payments.view', 'payments.manage'] }, 'u');
    expect(q.setPermissions).toHaveBeenCalledWith('new', ['payments.view', 'payments.manage']);
  });

  it('update checks only what it adds: keeping an old permission the actor lacks is fine', async () => {
    const { svc, q } = setup(holder('payments.view'));
    await svc.update('r1', { permissions: ['leads.view', 'payments.view'] }, 'u');
    expect(q.setPermissions).toHaveBeenCalledWith('r1', ['leads.view', 'payments.view']);
    await denied(svc.update('r1', { permissions: ['leads.view', 'expenses.view'] }, 'u'), 'permission_not_held');
  });

  it('duplicate refuses to copy permissions the actor lacks', async () => {
    const { svc, q } = setup(holder());
    await denied(svc.duplicate('r1', undefined, 'u'), 'permission_not_held');
    expect(q.insert).not.toHaveBeenCalled();
  });
});

describe('RolesService: your own role', () => {
  it('a role manager cannot edit the role they hold, not even its name', async () => {
    const { svc, q } = setup(holder());
    await denied(svc.update('own', { permissions: ['roles.manage', 'payments.manage'] }, 'u'), 'own_role');
    await denied(svc.update('own', { name_en: 'Me' }, 'u'), 'own_role');
    expect(q.update).not.toHaveBeenCalled();
    expect(q.setPermissions).not.toHaveBeenCalled();
  });

  it('a wildcard holder can', async () => {
    const { svc, q } = setup({ roleKey: 'manager', permissions: new Set(['*']) });
    await svc.update('own', { name_en: 'Me' }, 'u');
    expect(q.update).toHaveBeenCalledWith('own', { name_en: 'Me' });
  });

  it('another role is not blocked', async () => {
    const { svc, q } = setup(holder('leads.view'));
    await svc.update('r1', { name_en: 'Clerk 2' }, 'u');
    expect(q.update).toHaveBeenCalled();
  });
});
