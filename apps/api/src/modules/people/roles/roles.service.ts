import type { Permission, RoleCreate, RoleUpdate, RoleView, StaffUserView } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { AuditService } from '../../../common/audit/audit.service';
import { PermissionCache } from '../../../common/auth/permission.cache';
import { badRequest, conflict, forbidden, notFound } from '../../../common/http/errors';
import { cleanGrants, customKey, grantsOf, isPortalRole, isSystemAdmin, managerProblem, missingGrant, roleView, staffUserView, type RoleState } from './roles.logic';
import { regrantAudit, resetGrants, type Regrant } from './roles.reset';
import { ROLE_STORE, type ProfileRecord, type RoleRecord, type RoleStore } from './roles.store';

/**
 * «الأدوار والصلاحيات» (owner, 2026-10-05). Roles carry permissions; profiles.role stays the base
 * scope and always equals the held role's base_role. Every change clears the permission cache, and
 * one that would leave nobody with roles.manage (409 last_admin) or take it from the actor
 * (409 self_lockout) is refused before it is written. The admin, guardian and student grants are fixed (400).
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
    this.assertHolds(await this.state(), actorId, permissions);
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
    const role = this.find(state, id);
    if (input.permissions) {
      if (isSystemAdmin(role)) throw badRequest('admin_role_fixed');
      if (isPortalRole(role)) throw badRequest('portal_role_fixed');
      const permissions = cleanGrants(input.permissions);
      await this.regrant({ state, role, permissions, actorId: input.actorId, action: 'permissions_update' });
    }
    await this.store.renameRole(id, { name_ar: input.name_ar, name_en: input.name_en });
    this.cache.clear();
    return this.view(id);
  }

  /** «استعادة الافتراضي»: a system teacher / sales / assistant role back to its seeded grants. */
  async reset(id: string, actorId: string): Promise<RoleView> {
    const state = await this.state();
    const role = this.find(state, id);
    const target = resetGrants(role);
    if (!target.ok) throw badRequest(target.code);
    await this.regrant({ state, role, permissions: target.permissions, actorId, action: 'permissions_reset' });
    return this.view(id);
  }

  async remove(id: string): Promise<void> {
    const state = await this.state();
    const role = this.find(state, id);
    if (role.is_system) throw conflict('system_role');
    if (roleView(state, role).users > 0) throw conflict('role_in_use');
    await this.store.deleteRole(id);
    this.cache.clear();
  }

  async assign(input: { userId: string; roleId: string; actorId: string }): Promise<StaffUserView> {
    const state = await this.state();
    const role = this.find(state, input.roleId);
    const profile = state.profiles.find((p) => p.id === input.userId);
    if (!profile || role.base_role === 'guardian' || role.base_role === 'student') throw badRequest('not_staff');
    // The actor must outrank the target: it holds the new role's grants AND the target's current
    // ones, so a limited manager cannot demote the system admin or anyone above it.
    this.assertHolds(state, input.actorId, [...roleView(state, role).permissions, ...grantsOf(state, profile)]);
    const change = { role: role.base_role, role_id: role.is_system ? null : role.id };
    const moved: ProfileRecord = { ...profile, ...change };
    const next = { ...state, profiles: state.profiles.map((p) => (p.id === profile.id ? moved : p)) };
    this.assertManagers(next, input.actorId);
    await this.store.setProfileRole(profile.id, change);
    this.cache.clear();
    return staffUserView(next, moved);
  }

  /**
   * The actor must hold every grant being added AND every grant the role has today (a limited manager
   * cannot strip a role that carries more than it does); then the write, the cache, the audit row.
   */
  private async regrant(change: Regrant): Promise<void> {
    const { state, role, permissions, actorId } = change;
    this.assertHolds(state, actorId, [...cleanGrants(role.permissions), ...permissions]);
    const next = { ...state, roles: state.roles.map((r) => (r.id === role.id ? { ...r, permissions } : r)) };
    this.assertManagers(next, actorId);
    await this.store.setPermissions(role.id, permissions);
    this.cache.clear();
    await this.audit.record(regrantAudit(change));
  }

  /** 403 permission_not_held: nobody is given, or changed beyond, what the actor itself holds. */
  private assertHolds(state: RoleState, actorId: string, wanted: readonly Permission[]): void {
    const missing = missingGrant(state, actorId, wanted);
    if (missing) throw forbidden('permission_not_held', { permission: missing });
  }

  private assertManagers(next: RoleState, actorId: string): void {
    const problem = managerProblem(next, actorId);
    if (problem) throw conflict(problem);
  }

  private find(state: RoleState, id: string): RoleRecord {
    const role = state.roles.find((r) => r.id === id);
    if (!role) throw notFound('role_not_found');
    return role;
  }

  private async view(id: string): Promise<RoleView> {
    const state = await this.state();
    return roleView(state, this.find(state, id));
  }

  private async state(): Promise<RoleState> {
    const [roles, profiles] = await Promise.all([this.store.roles(), this.store.profiles()]);
    return { roles, profiles };
  }
}
