import type { Permission, RoleCreate, RoleUpdate, RoleView, StaffUserView } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import { PermissionCache } from '@/common/auth/permission.cache';
import { badRequest, conflict } from '@/common/http/errors';
import * as grants from './roles.grants';
import {
  cleanGrants,
  customKey,
  grantsOf,
  roleView,
  staffUserView,
  type RoleState,
} from './roles.logic';
import { regrantAudit, resetGrants, type Regrant } from './roles.reset';
import { ROLE_STORE, type ProfileRecord, type RoleStore } from './roles.store';

/**
 * «الأدوار والصلاحيات» (owner, 2026-10-05). Roles carry permissions; profiles.role stays the base
 * scope and always equals the held role's base_role. Every change clears the permission cache, and
 * one that would leave nobody with roles.manage (409 last_admin) or take it from the actor
 * (409 self_lockout) is refused before it is written (the checks: roles.grants.ts). The admin,
 * guardian and student grants are fixed (400).
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
    grants.assertHolds(await this.state(), actorId, permissions);
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
    const role = grants.findRole(state, id);
    if (input.permissions) {
      grants.assertEditable(role);
      const permissions = cleanGrants(input.permissions);
      const actorId = input.actorId;
      await this.regrant({ state, role, permissions, actorId, action: 'permissions_update' });
    }
    await this.store.renameRole(id, { name_ar: input.name_ar, name_en: input.name_en });
    this.cache.clear();
    return this.view(id);
  }

  /** «استعادة الافتراضي»: a system teacher / sales / assistant role back to its seeded grants. */
  async reset(id: string, actorId: string): Promise<RoleView> {
    const state = await this.state();
    const role = grants.findRole(state, id);
    const target = resetGrants(role);
    if (!target.ok) throw badRequest(target.code);
    const permissions = target.permissions;
    await this.regrant({ state, role, permissions, actorId, action: 'permissions_reset' });
    return this.view(id);
  }

  async remove(id: string): Promise<void> {
    const state = await this.state();
    const role = grants.findRole(state, id);
    if (role.is_system) throw conflict('system_role');
    if (roleView(state, role).users > 0) throw conflict('role_in_use');
    await this.store.deleteRole(id);
    this.cache.clear();
  }

  async assign(input: { userId: string; roleId: string; actorId: string }): Promise<StaffUserView> {
    const state = await this.state();
    const role = grants.findRole(state, input.roleId);
    const profile = grants.staffTarget(state, { userId: input.userId, role });
    // The actor must outrank the target: it holds the new role's grants AND the target's current
    // ones, so a limited manager cannot demote the system admin or anyone above it.
    const wanted = [...roleView(state, role).permissions, ...grantsOf(state, profile)];
    grants.assertHolds(state, input.actorId, wanted);
    const change = { role: role.base_role, role_id: role.is_system ? null : role.id };
    const moved: ProfileRecord = { ...profile, ...change };
    const next = grants.withProfile(state, moved);
    grants.assertManagers(next, input.actorId);
    await this.store.setProfileRole(profile.id, change);
    this.cache.clear();
    return staffUserView(next, moved);
  }

  /**
   * The actor must hold every grant being added AND every grant the role has today (a limited
   * manager cannot strip a role that carries more than it does); then the write, the cache, the
   * audit row.
   */
  private async regrant(change: Regrant): Promise<void> {
    const { state, role, permissions, actorId } = change;
    grants.assertHolds(state, actorId, [...cleanGrants(role.permissions), ...permissions]);
    grants.assertManagers(grants.withGrants(state, role.id, permissions), actorId);
    await this.store.setPermissions(role.id, permissions);
    this.cache.clear();
    await this.audit.record(regrantAudit(change));
  }

  private async view(id: string): Promise<RoleView> {
    const state = await this.state();
    return roleView(state, grants.findRole(state, id));
  }

  private async state(): Promise<RoleState> {
    const [roles, profiles] = await Promise.all([this.store.roles(), this.store.profiles()]);
    return { roles, profiles };
  }
}
