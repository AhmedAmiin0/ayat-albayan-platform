import type { PasswordReset, UserDetail, UserDisable, UserWithCredential } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { conflict, notFound } from '../../../../common/http/errors';
import { recordUser } from '../audit/users.audit';
import { prepareCredential, withLink } from '../auth/users.credential';
import { adminProblem, disabledCopy, replaced, without } from '../users.logic';
import { toUserDetail } from '../users.mapper';
import { UserEffects, UserPorts } from '../users.ports';
import { assertMayTouch, type Actor } from '../users.rules';
import type { UserRow } from '../store/users.store';

/** disable / enable / reset-password / sign-out / delete. Each one clears the permission cache. */
@Injectable()
export class UsersLifecycleService {
  constructor(
    private readonly ports: UserPorts,
    private readonly effects: UserEffects,
  ) {}

  /** 409 cannot_disable_self / last_admin. The profile is marked first: the guard refuses at once, the ban follows. */
  async disable(id: string, input: UserDisable, actor: Actor): Promise<UserDetail> {
    if (id === actor.id) throw conflict('cannot_disable_self');
    const { state, target } = await this.ports.access.target(id);
    assertMayTouch(actor, state, target);
    const problem = adminProblem(replaced(state, disabledCopy(target)));
    if (problem) throw conflict(problem);
    const before = await this.row(id);
    await this.ports.store.setDisabled(id, { by: actor.id, reason: input.reason ?? null });
    await this.ports.auth.update(id, { banned: true });
    await this.ports.auth.revokeSessions(id);
    // No push for a disabled account: revoking its sessions ends their device bindings, and the
    // disabled_at trigger (migration 700) drops every app token and browser; PushAudience skips it.
    await this.ports.store.forgetBrowsers(id);
    this.effects.cache.clear();
    return this.done({ id, actor, action: 'disable', before });
  }

  /** 409 self_lockout: nobody re-enables themselves (a disabled login cannot reach the API anyway). */
  async enable(id: string, actor: Actor): Promise<UserDetail> {
    if (id === actor.id) throw conflict('self_lockout');
    const { state, target } = await this.ports.access.target(id);
    assertMayTouch(actor, state, target);
    const before = await this.row(id);
    await this.ports.auth.update(id, { banned: false });
    await this.ports.store.setDisabled(id, null);
    this.effects.cache.clear();
    return this.done({ id, actor, action: 'enable', before });
  }

  /** A new password (typed or generated) or a recovery link; the secret is returned once, never stored. */
  async resetPassword(id: string, input: PasswordReset, actor: Actor): Promise<UserWithCredential> {
    const { state, target } = await this.ports.access.target(id);
    assertMayTouch(actor, state, target);
    const row = await this.row(id);
    const prepared = prepareCredential({ mode: input.credential, password: input.password, min: this.effects.config.passwordMinLength });
    if (prepared.password) await this.ports.auth.update(id, { password: prepared.password });
    const issued = await withLink(this.ports.auth, { email: row.email ?? '', prepared, mode: input.credential });
    if (prepared.password) await this.ports.auth.revokeSessions(id);
    await recordUser(this.effects.audit, { actorId: actor.id, userId: id, action: 'reset_password', extra: { credential_mode: input.credential } });
    return { user: toUserDetail(row), credential: issued };
  }

  async signOut(id: string, actor: Actor): Promise<void> {
    const { state, target } = await this.ports.access.target(id);
    assertMayTouch(actor, state, target);
    await this.ports.auth.revokeSessions(id);
    await recordUser(this.effects.audit, { actorId: actor.id, userId: id, action: 'sign_out' });
  }

  /** 409 cannot_delete_self / last_admin / users_has_history {references, hint: 'disable_instead'}. */
  async remove(id: string, actor: Actor): Promise<void> {
    if (id === actor.id) throw conflict('cannot_delete_self');
    const { state, target } = await this.ports.access.target(id);
    assertMayTouch(actor, state, target);
    const problem = adminProblem(without(state, id));
    if (problem) throw conflict(problem);
    const history = (await this.ports.store.references(id)).filter((r) => r.kind === 'history');
    if (history.length > 0) {
      throw conflict('users_has_history', {
        references: history.map((r) => ({ table: r.ref_table, column: r.ref_column, count: r.n })),
        hint: 'disable_instead',
      });
    }
    const before = await this.row(id);
    // The auth user goes first; the profile row goes with it, and the teachers / guardians / students
    // profile_id foreign keys (on delete set null) release the linked record: no separate unlink.
    await this.ports.auth.remove(id);
    this.effects.cache.clear();
    await recordUser(this.effects.audit, { actorId: actor.id, userId: id, action: 'delete', before });
  }

  private async done(ctx: { id: string; actor: Actor; action: string; before: UserRow }): Promise<UserDetail> {
    const after = await this.row(ctx.id);
    await recordUser(this.effects.audit, { actorId: ctx.actor.id, userId: ctx.id, action: ctx.action, before: ctx.before, after });
    return toUserDetail(after);
  }

  private async row(id: string): Promise<UserRow> {
    const row = await this.ports.store.get(id);
    if (!row) throw notFound('user_not_found');
    return row;
  }
}
