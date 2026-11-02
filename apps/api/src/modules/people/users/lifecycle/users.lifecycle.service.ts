import type { PasswordReset, UserDetail, UserDisable, UserWithCredential } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { conflict, notFound } from '@/common/http/errors';
import { UserJournal } from '@/modules/people/users/audit/users.journal';
import { UserLogins } from '@/modules/people/users/auth/users.logins';
import { adminProblem, disabledCopy, replaced, without } from '@/modules/people/users/users.logic';
import { toUserDetail } from '@/modules/people/users/users.mapper';
import { UserAccess } from '@/modules/people/users/users.access';
import { assertMayTouch, type Actor } from '@/modules/people/users/users.rules';
import { USER_STORE, type UserRow, type UserStore } from '@/modules/people/users/store/users.store';

/** disable / enable / reset-password / sign-out / delete. Each one clears the permission cache. */
@Injectable()
export class UsersLifecycleService {
  constructor(
    @Inject(USER_STORE) private readonly store: UserStore,
    private readonly access: UserAccess,
    private readonly logins: UserLogins,
    private readonly journal: UserJournal,
  ) {}

  /**
   * 409 cannot_disable_self / last_admin. The profile is marked first: the guard refuses at once,
   * the ban follows.
   */
  async disable(id: string, input: UserDisable, actor: Actor): Promise<UserDetail> {
    if (id === actor.id) throw conflict('cannot_disable_self');
    const { state, target } = await this.access.target(id);
    assertMayTouch(actor, state, target);
    const problem = adminProblem(replaced(state, disabledCopy(target)));
    if (problem) throw conflict(problem);
    const before = await this.row(id);
    await this.store.setDisabled(id, { by: actor.id, reason: input.reason ?? null });
    await this.logins.update(id, { banned: true });
    await this.logins.revokeSessions(id);
    // No push for a disabled account: revoking its sessions ends their device bindings, and the
    // disabled_at trigger (migration 700) drops every app token and browser; PushAudience skips it.
    await this.store.forgetBrowsers(id);
    this.journal.forget();
    return this.done({ id, actor, action: 'disable', before });
  }

  /** 409 self_lockout: nobody re-enables themselves (a disabled login cannot reach the API). */
  async enable(id: string, actor: Actor): Promise<UserDetail> {
    if (id === actor.id) throw conflict('self_lockout');
    const { state, target } = await this.access.target(id);
    assertMayTouch(actor, state, target);
    const before = await this.row(id);
    await this.logins.update(id, { banned: false });
    await this.store.setDisabled(id, null);
    this.journal.forget();
    return this.done({ id, actor, action: 'enable', before });
  }

  /** A new password (typed or generated) or a recovery link; the secret is shown once only. */
  async resetPassword(id: string, input: PasswordReset, actor: Actor): Promise<UserWithCredential> {
    const { state, target } = await this.access.target(id);
    assertMayTouch(actor, state, target);
    const row = await this.row(id);
    const prepared = this.logins.prepare({ mode: input.credential, password: input.password });
    if (prepared.password) await this.logins.update(id, { password: prepared.password });
    const issued = await this.logins.issue({
      email: row.email ?? '',
      prepared,
      mode: input.credential,
    });
    if (prepared.password) await this.logins.revokeSessions(id);
    await this.journal.record({
      actorId: actor.id,
      userId: id,
      action: 'reset_password',
      extra: { credential_mode: input.credential },
    });
    return { user: toUserDetail(row), credential: issued };
  }

  async signOut(id: string, actor: Actor): Promise<void> {
    const { state, target } = await this.access.target(id);
    assertMayTouch(actor, state, target);
    await this.logins.revokeSessions(id);
    await this.journal.record({ actorId: actor.id, userId: id, action: 'sign_out' });
  }

  /** 409 cannot_delete_self / last_admin / users_has_history {references, hint: disable_instead} */
  async remove(id: string, actor: Actor): Promise<void> {
    if (id === actor.id) throw conflict('cannot_delete_self');
    const { state, target } = await this.access.target(id);
    assertMayTouch(actor, state, target);
    const problem = adminProblem(without(state, id));
    if (problem) throw conflict(problem);
    const history = (await this.store.references(id)).filter((r) => r.kind === 'history');
    if (history.length > 0) {
      throw conflict('users_has_history', {
        references: history.map((r) => ({ table: r.ref_table, column: r.ref_column, count: r.n })),
        hint: 'disable_instead',
      });
    }
    const before = await this.row(id);
    // The auth user goes first; the profile row goes with it, and the teachers / guardians /
    // students profile_id foreign keys (on delete set null) release the linked record: no separate
    // unlink.
    await this.logins.remove(id);
    this.journal.forget();
    await this.journal.record({ actorId: actor.id, userId: id, action: 'delete', before });
  }

  private async done(ctx: {
    id: string;
    actor: Actor;
    action: string;
    before: UserRow;
  }): Promise<UserDetail> {
    const after = await this.row(ctx.id);
    await this.journal.record({
      actorId: ctx.actor.id,
      userId: ctx.id,
      action: ctx.action,
      before: ctx.before,
      after,
    });
    return toUserDetail(after);
  }

  private async row(id: string): Promise<UserRow> {
    const row = await this.store.get(id);
    if (!row) throw notFound('user_not_found');
    return row;
  }
}
