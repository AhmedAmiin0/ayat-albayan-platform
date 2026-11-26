import type { UserDetail, UserUpdate } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { badRequest, conflict } from '@/common/http/errors';
import { UserJournal } from '@/modules/people/users/audit/users.journal';
import { UserAccess } from '@/modules/people/users/users.access';
import {
  adminProblem,
  chooseRole,
  lockedOutOfUsers,
  opensRecord,
  profilePatch,
  replaced,
  roleChangeBlocked,
  type UserState,
} from '@/modules/people/users/users.logic';
import { assertMayAssign, assertMayTouch, type Actor } from '@/modules/people/users/users.rules';
import { UsersService } from '@/modules/people/users/users.service';
import type { UserRow } from '@/modules/people/users/store/users.store';
import { linkKindOf } from '@/modules/people/users/lifecycle/users.record-linker';
import type { RecordLink } from '@/modules/people/users/lifecycle/users.record-linker.types';
import { UserProfileWriter } from './users.profile-writer';

interface RoleChange {
  input: UserUpdate;
  target: { role: UserRow['role']; role_id: string | null };
  state: UserState;
  actor: Actor;
  linked: boolean;
}

interface RecordAsk {
  input: UserUpdate;
  before: UserRow;
  /** The new base role (undefined = unchanged). */
  to: UserRow['role'] | undefined;
}

const keepsRole = (input: UserUpdate): boolean => input.role_id === null && !input.role;
const namesRecord = (input: UserUpdate): boolean =>
  input.linked_id !== undefined || input.new_teacher !== undefined;
const DEFAULT_TZ = 'Asia/Riyadh';

/** The record a request names, linked with the profile's phone and zone after the patch. */
function recordLink(before: UserRow, ctx: { input: UserUpdate; to: UserRow['role'] }) {
  const kind = linkKindOf(ctx.to);
  const phone = ctx.input.phone_e164 === undefined ? before.phone_e164 : ctx.input.phone_e164;
  const tz = ctx.input.tz ?? before.tz ?? DEFAULT_TZ;
  const profile = { id: before.id, phone_e164: phone, tz };
  return kind ? { kind, request: ctx.input, profile } : undefined;
}

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
   * last_admin / self_lockout / email_taken / phone_taken / link_taken, 400 link_not_allowed /
   * link_target_not_found. All checks (email and phone owners and the named record included) come
   * before the first write, and the auth email changes last: a refused request leaves everything
   * as it was.
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
    const record = this.recordOf({ input, before, to: chosen?.choice.role });
    await this.writer.check(id, input, record);
    await this.writer.write(id, { patch, input, record });
    if (chosen) this.journal.forget();
    await this.writer.setEmail(id, input.email);
    const after = await this.users.row(id);
    await this.journal.record({ actorId: actor.id, userId: id, action: 'update', before, after });
    return this.users.detail(after);
  }

  /** 400 link_not_allowed: a named record needs a move into a record-backed role it opens. */
  private recordOf(ctx: RecordAsk): RecordLink | undefined {
    if (!namesRecord(ctx.input)) return undefined;
    const to = ctx.to ?? ctx.before.role;
    const move = { from: ctx.before.role, to, linked: ctx.before.linked !== null, named: true };
    if (!opensRecord(move)) throw badRequest('link_not_allowed');
    return recordLink(ctx.before, { input: ctx.input, to });
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
    const naming = namesRecord(input);
    const move = { from: target.role, to: choice.role, linked: ctx.linked, named: naming };
    const blocked = roleChangeBlocked(move);
    if (blocked) throw conflict('role_change_linked');
    assertMayAssign(actor, state, record);
    return chosen;
  }
}
