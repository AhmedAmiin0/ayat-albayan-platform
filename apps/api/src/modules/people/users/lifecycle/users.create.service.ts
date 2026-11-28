import type { UserCreate, UserWithCredential } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { badRequest, conflict, notFound } from '@/common/http/errors';
import { UserJournal } from '@/modules/people/users/audit/users.journal';
import { UserLogins } from '@/modules/people/users/auth/users.logins';
import { chooseRole } from '@/modules/people/users/users.logic';
import { userDetailOf } from '@/modules/people/users/users.mapper';
import { UserAccess } from '@/modules/people/users/users.access';
import { assertMayAssign, type Actor } from '@/modules/people/users/users.rules';
import { USER_STORE, type UserStore } from '@/modules/people/users/store/users.store';
import { linkKindOf, UserRecordLinker } from './users.record-linker';

const profileDefaults = (input: UserCreate) => ({
  full_name: input.full_name,
  phone_e164: input.phone_e164 ?? null,
  locale: input.locale ?? null,
  tz: input.tz ?? 'Asia/Riyadh',
});

/** POST /users: the login through the Auth Admin API, its profile, and the linked record. */
@Injectable()
export class UsersCreateService {
  private readonly records: UserRecordLinker;

  constructor(
    @Inject(USER_STORE) private readonly store: UserStore,
    private readonly access: UserAccess,
    private readonly logins: UserLogins,
    private readonly journal: UserJournal,
  ) {
    this.records = new UserRecordLinker(store);
  }

  /**
   * 403 permission_not_held / system_admin_only / admin_role_only, 409 email_taken / link_taken,
   * 400 password_* / link_target_not_found / unknown_role / role_mismatch.
   */
  async create(input: UserCreate, actor: Actor): Promise<UserWithCredential> {
    const state = await this.access.state();
    const chosen = chooseRole(state.roles, input);
    if (typeof chosen === 'string' || chosen === null) throw badRequest(chosen ?? 'unknown_role');
    assertMayAssign(actor, state, chosen.record);
    const kind = linkKindOf(input.role);
    if (kind) await this.records.assertLinkable(kind, input);
    const prepared = this.logins.prepare({ mode: input.credential, password: input.password });
    const { id, adopted } = await this.login(input, prepared.password);
    try {
      const profile = { id, ...profileDefaults(input) };
      await this.store.upsertProfile({ ...profile, ...chosen.choice });
      if (kind) await this.records.link({ kind, request: input, profile });
    } catch (e) {
      if (!adopted) await this.logins.remove(id);
      throw e;
    }
    const issued = await this.logins.issue({
      email: input.email,
      prepared,
      mode: input.credential,
    });
    const row = await this.store.get(id);
    if (!row) throw notFound('user_not_found');
    await this.journal.record({
      actorId: actor.id,
      userId: id,
      action: 'create',
      after: row,
      extra: { credential_mode: input.credential },
    });
    return { user: userDetailOf(row), credential: issued };
  }

  /**
   * The auth user: new, or one left without a profile by a failed attempt (idempotent retry). An
   * adopted login is refreshed like a new one (confirmed email, name) and gets a password of this
   * request (a random one in link mode) with its sessions revoked: whatever the failed attempt or
   * its owner left behind no longer opens it.
   */
  private async login(
    input: UserCreate,
    password: string | undefined,
  ): Promise<{ id: string; adopted: boolean }> {
    const existing = await this.logins.findIdByEmail(input.email);
    if (!existing)
      return {
        id: await this.logins.create({ email: input.email, password, fullName: input.full_name }),
        adopted: false,
      };
    if (await this.store.profile(existing)) throw conflict('email_taken');
    const fresh = password ?? this.logins.fresh();
    await this.logins.update(existing, {
      password: fresh,
      fullName: input.full_name,
      confirmEmail: true,
    });
    await this.logins.revokeSessions(existing);
    return { id: existing, adopted: true };
  }
}
