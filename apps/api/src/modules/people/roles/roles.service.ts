import type { RoleCreate, RoleUpdate, RoleView, StaffUserView } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import { PermissionCache } from '@/common/auth/permission.cache';
import { badRequest } from '@/common/http/errors';
import { RoleGrants } from './roles.grants';
import { cleanGrants, customKey, roleView, staffUserView, type RoleState } from './roles.logic';
import { regrantAudit, resetGrants, type Regrant } from './roles.reset';
import { ROLE_STORE, type RoleStore } from './roles.store';

/**
 * «الأدوار والصلاحيات» (owner, 2026-10-05). Roles carry permissions; profiles.role stays the base
 * scope and always equals the held role's base_role. Every change clears the permission cache, and
 * one that would leave nobody with roles.manage (409 last_admin) or take it from the actor
 * (409 self_lockout) is refused before it is written (RoleGrants). The admin, guardian and student
 * grants are fixed (400).
 */
@Injectable()
export class RolesService {
  constructor(
    @Inject(ROLE_STORE) private readonly store: RoleStore,
    private readonly cache: PermissionCache,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<RoleView[]> {
    const state = await this.state();
    return state.roles.map((r) => roleView(state, r));
  }

  async users(): Promise<StaffUserView[]> {
    const state = await this.state();
    return state.profiles.map((p) => staffUserView(state, p));
  }

  async create(input: RoleCreate, actorId: string): Promise<RoleView> {
    const permissions = cleanGrants(input.permissions);
    RoleGrants.assertHolds(await this.state(), actorId, permissions);
    const id = await this.store.insertRole({
      key: customKey(),
      name_ar: input.name_ar,
      name_en: input.name_en ?? null,
      base_role: input.base_role,
    });
    await this.store.setPermissions(id, permissions);
    return this.view(id);
  }

  async update(id: string, input: RoleUpdate & { actorId: string }): Promise<RoleView> {
    const state = await this.state();
    const role = RoleGrants.find(state, id);
    if (input.permissions) {
      RoleGrants.assertEditable(role);
      const permissions = cleanGrants(input.permissions);
      await this.regrant({
        state,
        role,
        permissions,
        actorId: input.actorId,
        action: 'permissions_update',
      });
    }
    await this.store.renameRole(id, { name_ar: input.name_ar, name_en: input.name_en });
    this.cache.clear();
    return this.view(id);
  }

  /** «استعادة الافتراضي»: a system teacher / sales / assistant role back to its seeded grants. */
  async reset(id: string, actorId: string): Promise<RoleView> {
    const state = await this.state();
    const role = RoleGrants.find(state, id);
    const target = resetGrants(role);
    if (!target.ok) throw badRequest(target.code);
    await this.regrant({
      state,
      role,
      permissions: target.permissions,
      actorId,
      action: 'permissions_reset',
    });
    return this.view(id);
  }

  async remove(id: string): Promise<void> {
    const state = await this.state();
    const role = RoleGrants.find(state, id);
    RoleGrants.assertRemovable(state, role);
    await this.store.deleteRole(id);
    this.cache.clear();
  }

  async assign(input: { userId: string; roleId: string; actorId: string }): Promise<StaffUserView> {
    const state = await this.state();
    const role = RoleGrants.find(state, input.roleId);
    const { change, moved, next } = RoleGrants.assigned({
      state,
      role,
      profileId: input.userId,
      actorId: input.actorId,
    });
    await this.store.setProfileRole(moved.id, change);
    this.cache.clear();
    return staffUserView(next, moved);
  }

  /** The checks of RoleGrants, then the write, the cache, the audit row. */
  private async regrant(change: Regrant): Promise<void> {
    RoleGrants.regranted(change);
    await this.store.setPermissions(change.role.id, change.permissions);
    this.cache.clear();
    await this.audit.record(regrantAudit(change));
  }

  private async view(id: string): Promise<RoleView> {
    const state = await this.state();
    return roleView(state, RoleGrants.find(state, id));
  }

  private async state(): Promise<RoleState> {
    const [roles, profiles] = await Promise.all([this.store.roles(), this.store.profiles()]);
    return { roles, profiles };
  }
}
