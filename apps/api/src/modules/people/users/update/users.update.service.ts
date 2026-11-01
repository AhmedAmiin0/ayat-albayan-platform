import type { UserDetail, UserUpdate } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { badRequest, conflict } from '@/common/http/errors';
import { UserJournal } from '@/modules/people/users/audit/users.journal';
import { UserAccess } from '@/modules/people/users/users.access';
import {
  adminProblem,
  chooseRole,
  lockedOutOfUsers,
  profilePatch,
  replaced,
  roleChangeBlocked,
  type UserState,
} from '@/modules/people/users/users.logic';
import { assertMayAssign, assertMayTouch, type Actor } from '@/modules/people/users/users.rules';
import { UsersService } from '@/modules/people/users/users.service';
import type { UserRow } from '@/modules/people/users/store/users.store';
import { UserProfileWriter } from './users.profile-writer';

interface RoleChange {
  input: UserUpdate;
  target: { role: UserRow['role']; role_id: string | null };
  state: UserState;
  actor: Actor;
  linked: boolean;
}

const keepsRole = (input: UserUpdate): boolean => input.role_id === null && !input.role;

/** PATCH /users/:id: profile, role, email and phone of one login. */
@Injectable()
export class UsersUpdateService {
  constructor(
    private readonly access: UserAccess,
    private readonly users: UsersService,
    private readonly writer: UserProfileWriter,
    private readonly journal: UserJournal,
  ) {}

  /**
   * 403 permission_not_held / system_admin_only / admin_role_only, 409 role_change_linked /
   * last_admin / self_lockout / email_taken / phone_taken. All checks (email and phone owners
   * included) come before the first write, and the auth email changes last: a refused request
   * leaves everything as it was.
   */
  async update(id: string, input: UserUpdate, actor: Actor): Promise<UserDetail> {
    const { state, target } = await this.access.target(id);
    assertMayTouch(actor, state, target);
    const before = await this.users.row(id);
    const patch = profilePatch(input);
    const chosen = this.pickRole({ input, target, state, actor, linked: before.linked !== null });
    if (chosen) {
      Object.assign(patch, chosen.choice);
      const moved = replaced(state, { ...target, ...chosen.choice });
      this.assertSafe({ moved, actor, self: id === actor.id });
    }
    await this.writer.check(id, input);
    await this.writer.write(id, { patch, input });
    if (chosen) this.journal.forget();
    await this.writer.setEmail(id, input.email);
    const after = await this.users.row(id);
    await this.journal.record({ actorId: actor.id, userId: id, action: 'update', before, after });
    return this.users.detail(after);
  }

  private assertSafe(ctx: { moved: UserState; actor: Actor; self: boolean }): void {
    const problem = adminProblem(ctx.moved);
    if (problem) throw conflict(problem);
    if (ctx.self && lockedOutOfUsers(ctx.moved, ctx.actor.id)) throw conflict('self_lockout');
  }

  /** The new (base role, role_id) when the request changes it, else null. */
  private pickRole(ctx: RoleChange) {
    const { input, target, state, actor } = ctx;
    const named = keepsRole(input) ? { role: target.role, role_id: null } : input;
    const chosen = chooseRole(state.roles, named);
    if (typeof chosen === 'string') throw badRequest(chosen);
    if (!chosen) return null;
    const { choice, record } = chosen;
    if (choice.role === target.role && choice.role_id === target.role_id) return null;
    const blocked = roleChangeBlocked({ from: target.role, to: choice.role, linked: ctx.linked });
    if (blocked) throw conflict('role_change_linked');
    assertMayAssign(actor, state, record);
    return chosen;
  }
}
