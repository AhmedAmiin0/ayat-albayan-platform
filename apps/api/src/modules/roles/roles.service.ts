import {
  roleCreateSchema,
  roleUpdateSchema,
  type RoleCreateInput,
  type RoleUpdateInput,
  type RoleView,
} from '@ab/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import { PermissionResolver } from '../../common/auth/permission-resolver';
import { parseOrThrow, sentOnly } from '../teachers/http';
import { assertGrantable, assertNotOwnRole } from './roles.access';
import { copyKey, copyName, diffPermissions, toView, type RoleRow } from './roles.mapper';
import { RolesQueries } from './roles.queries';
import { assertDeletable, assertUpdatable } from './roles.rules';

/** Roles CRUD (owner, 2026-10-05). Every change drops the permission cache, so it applies at once. */
@Injectable()
export class RolesService {
  constructor(
    private readonly q: RolesQueries,
    private readonly audit: AuditService,
    private readonly resolver: PermissionResolver,
  ) {}

  async list(): Promise<RoleView[]> {
    const [roles, perms, counts] = await Promise.all([this.q.roles(), this.q.permissions(), this.q.userCounts()]);
    return roles.map((r) => toView(r, perms.get(r.id) ?? [], counts.get(r.id) ?? 0));
  }

  async get(id: string): Promise<RoleView> {
    const role = await this.find(id);
    const [perms, counts] = await Promise.all([this.q.permissions(), this.q.userCounts()]);
    return toView(role, perms.get(id) ?? [], counts.get(id) ?? 0);
  }

  async create(body: unknown, actorId: string): Promise<RoleView> {
    const input = parseOrThrow(roleCreateSchema, body);
    const actor = await this.resolver.resolve(actorId);
    assertGrantable({ actor, target: null, requested: input.permissions, added: input.permissions });
    const view = await this.insert(input);
    await this.record({ actorId, action: 'create', after: view });
    return view;
  }

  async update(id: string, body: unknown, actorId: string): Promise<RoleView> {
    const patch: RoleUpdateInput = sentOnly(parseOrThrow(roleUpdateSchema, body), body);
    const before = await this.get(id);
    const role = await this.find(id);
    assertUpdatable(role, patch, before.user_count);
    const actor = await this.resolver.resolve(actorId);
    assertNotOwnRole(actor, role);
    const { permissions, ...fields } = patch;
    if (permissions) {
      const added = diffPermissions(before.permissions, permissions).add;
      assertGrantable({ actor, target: role, requested: permissions, added });
    }
    try {
      await this.q.update(id, fields);
      if (permissions) await this.q.setPermissions(id, permissions);
    } finally {
      this.resolver.invalidate();
    }
    const after = await this.get(id);
    await this.record({ actorId, action: 'update', before, after });
    return after;
  }

  async remove(id: string, actorId: string): Promise<void> {
    const before = await this.get(id);
    assertDeletable(await this.find(id), before.user_count);
    try {
      await this.q.remove(id);
    } finally {
      this.resolver.invalidate();
    }
    await this.record({ actorId, action: 'delete', before });
  }

  /** A custom copy of any role: same base role and permissions, a free key, "(copy)" names. */
  async duplicate(id: string, body: unknown, actorId: string): Promise<RoleView> {
    const source = await this.get(id);
    const taken = new Set((await this.q.roles()).map((r) => r.key));
    const over = parseOrThrow(roleCreateSchema.partial(), body ?? {});
    const input: RoleCreateInput = {
      key: over.key ?? copyKey(source.key, taken),
      name_ar: over.name_ar ?? copyName('ar', source.name_ar),
      name_en: over.name_en ?? copyName('en', source.name_en),
      base_role: source.base_role,
      permissions: source.permissions,
    };
    const actor = await this.resolver.resolve(actorId);
    assertGrantable({ actor, target: null, requested: input.permissions, added: input.permissions });
    const view = await this.insert(input);
    await this.record({ actorId, action: 'duplicate', before: source, after: view });
    return view;
  }

  private async insert(input: RoleCreateInput): Promise<RoleView> {
    const { permissions, ...fields } = input;
    const row = await this.q.insert(fields);
    try {
      await this.q.setPermissions(row.id, permissions);
    } catch (error) {
      await this.q.remove(row.id);
      throw error;
    }
    return toView(row, permissions, 0);
  }

  private async find(id: string): Promise<RoleRow> {
    const role = await this.q.role(id);
    if (!role) throw new NotFoundException();
    return role;
  }

  private record(e: { actorId: string; action: string; before?: RoleView; after?: RoleView }): Promise<void> {
    return this.audit.record({
      actorId: e.actorId,
      entity: 'roles',
      entityId: e.after?.id ?? e.before?.id ?? '',
      action: `role_${e.action}`,
      before: e.before ? { ...e.before } : undefined,
      after: e.after ? { ...e.after } : undefined,
    });
  }
}
