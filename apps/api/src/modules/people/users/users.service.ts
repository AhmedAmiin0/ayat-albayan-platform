import { type LinkCandidate, type LinkKind, type UserDetail, type UserPage, type UserRoleOption, type UserUpdate, type UsersListQuery } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { badRequest, conflict, notFound } from '../../../common/http/errors';
import { recordUser } from './audit/users.audit';
import { adminProblem, chooseRole, lockedOutOfUsers, profilePatch, replaced, roleChangeBlocked, type UserState } from './users.logic';
import { toUserDetail, toUserView } from './users.mapper';
import { UserEffects, UserPorts } from './users.ports';
import { assertMayAssign, assertMayList, assertMayTouch, canAssign, type Actor } from './users.rules';
import type { UserRow } from './store/users.store';

export type { Actor } from './users.rules';

interface RoleChange {
  input: UserUpdate;
  target: { role: UserRow['role']; role_id: string | null };
  state: UserState;
  actor: Actor;
  linked: boolean;
}

/** «المستخدمون»: the directory, the pickers and PATCH /users/:id. Creation and lifecycle live in sibling services. */
@Injectable()
export class UsersService {
  constructor(
    private readonly ports: UserPorts,
    private readonly effects: UserEffects,
  ) {}

  async list(query: UsersListQuery): Promise<UserPage> {
    const { rows, total } = await this.ports.store.list(query);
    return { items: rows.map(toUserView), total, page: query.page, pageSize: query.pageSize };
  }

  async get(id: string): Promise<UserDetail> {
    return toUserDetail(await this.row(id));
  }

  /** 403 permission_not_held unless the actor holds the write permission of that table (students.write, ...). */
  candidates(input: { kind: LinkKind; q?: string | undefined }, actor: Actor): Promise<LinkCandidate[]> {
    assertMayList(actor, input.kind);
    return this.ports.store.candidates(input.kind, input.q);
  }

  async roleOptions(actor: Actor): Promise<UserRoleOption[]> {
    const state = await this.ports.access.state();
    return state.roles.map((r) => ({
      id: r.id,
      key: r.key,
      name_ar: r.name_ar,
      name_en: r.name_en,
      base_role: r.base_role,
      is_system: r.is_system,
      assignable: canAssign(actor, state, r),
    }));
  }

  /**
   * 403 permission_not_held / system_admin_only / admin_role_only, 409 role_change_linked / last_admin /
   * self_lockout / email_taken / phone_taken. All checks (email and phone owners included) come before
   * the first write, and the auth email changes last: a refused request leaves everything as it was.
   */
  async update(id: string, input: UserUpdate, actor: Actor): Promise<UserDetail> {
    const { state, target } = await this.ports.access.target(id);
    assertMayTouch(actor, state, target);
    const before = await this.row(id);
    const patch = profilePatch(input);
    const chosen = this.pickRole({ input, target, state, actor, linked: before.linked !== null });
    if (chosen) {
      Object.assign(patch, chosen.choice);
      this.assertSafe({ moved: replaced(state, { ...target, ...chosen.choice }), actor, self: id === actor.id });
    }
    if (input.email !== undefined) await this.assertEmailFree(id, input.email);
    if (input.phone_e164) await this.assertPhoneFree(id, input.phone_e164);
    if (Object.keys(patch).length > 0) await this.ports.store.updateProfile(id, patch);
    await this.syncTeacher(id, input);
    if (chosen) this.effects.cache.clear();
    if (input.email !== undefined) await this.ports.auth.update(id, { email: input.email });
    const after = await this.row(id);
    await recordUser(this.effects.audit, { actorId: actor.id, userId: id, action: 'update', before, after });
    return toUserDetail(after);
  }

  private assertSafe(ctx: { moved: UserState; actor: Actor; self: boolean }): void {
    const problem = adminProblem(ctx.moved);
    if (problem) throw conflict(problem);
    if (ctx.self && lockedOutOfUsers(ctx.moved, ctx.actor.id)) throw conflict('self_lockout');
  }

  /** The new (base role, role_id) when the request changes it, else null. */
  private pickRole(ctx: RoleChange) {
    const { input, target, state, actor } = ctx;
    const named = input.role_id === null && !input.role ? { role: target.role, role_id: null } : input;
    const chosen = chooseRole(state.roles, named);
    if (typeof chosen === 'string') throw badRequest(chosen);
    if (!chosen) return null;
    const { choice, record } = chosen;
    if (choice.role === target.role && choice.role_id === target.role_id) return null;
    if (roleChangeBlocked({ from: target.role, to: choice.role, linked: ctx.linked })) throw conflict('role_change_linked');
    assertMayAssign(actor, state, record);
    return chosen;
  }

  private async assertEmailFree(id: string, email: string): Promise<void> {
    const owner = await this.ports.auth.findIdByEmail(email);
    if (owner && owner !== id) throw conflict('email_taken');
  }

  /** profiles.phone_e164 and teachers.phone_e164 are both unique: check before anything is written. */
  private async assertPhoneFree(id: string, phone: string): Promise<void> {
    if (await this.ports.store.phoneTaken(phone, id)) throw conflict('phone_taken');
  }

  /** Name and phone follow the profile for a linked teacher (guardian / student rows are separate records). */
  private async syncTeacher(id: string, input: UserUpdate): Promise<void> {
    const sync: { display_name_ar?: string; phone_e164?: string | null } = {};
    if (input.full_name !== undefined) sync.display_name_ar = input.full_name;
    if (input.phone_e164 !== undefined) sync.phone_e164 = input.phone_e164;
    if (Object.keys(sync).length > 0) await this.ports.store.syncTeacher(id, sync);
  }

  private async row(id: string): Promise<UserRow> {
    const row = await this.ports.store.get(id);
    if (!row) throw notFound('user_not_found');
    return row;
  }
}
