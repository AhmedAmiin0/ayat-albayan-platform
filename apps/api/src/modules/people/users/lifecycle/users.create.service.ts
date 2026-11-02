import type { LinkKind, UserCreate, UserWithCredential } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { badRequest, conflict, notFound } from '@/common/http/errors';
import { UserJournal } from '@/modules/people/users/audit/users.journal';
import { UserLogins } from '@/modules/people/users/auth/users.logins';
import { chooseRole } from '@/modules/people/users/users.logic';
import { toUserDetail } from '@/modules/people/users/users.mapper';
import { UserAccess } from '@/modules/people/users/users.access';
import { assertMayAssign, type Actor } from '@/modules/people/users/users.rules';
import { USER_STORE, type UserStore } from '@/modules/people/users/store/users.store';

/** Roles whose login belongs to an existing teachers / students / guardians row. */
const LINK_KIND: Partial<Record<UserCreate['role'], LinkKind>> = {
  teacher: 'teacher',
  student: 'student',
  guardian: 'guardian',
};

const profileDefaults = (input: UserCreate) => ({
  full_name: input.full_name,
  phone_e164: input.phone_e164 ?? null,
  locale: input.locale ?? 'ar',
  tz: input.tz ?? 'Asia/Riyadh',
});

/** POST /users: the login through the Auth Admin API, its profile, and the linked record. */
@Injectable()
export class UsersCreateService {
  constructor(
    @Inject(USER_STORE) private readonly store: UserStore,
    private readonly access: UserAccess,
    private readonly logins: UserLogins,
    private readonly journal: UserJournal,
  ) {}

  /**
   * 403 permission_not_held / system_admin_only / admin_role_only, 409 email_taken / link_taken,
   * 400 password_* / link_target_not_found / unknown_role / role_mismatch.
   */
  async create(input: UserCreate, actor: Actor): Promise<UserWithCredential> {
    const state = await this.access.state();
    const chosen = chooseRole(state.roles, input);
    if (typeof chosen === 'string' || chosen === null) throw badRequest(chosen ?? 'unknown_role');
    assertMayAssign(actor, state, chosen.record);
    const kind = LINK_KIND[input.role];
    if (kind && input.linked_id) await this.assertLinkable(kind, input.linked_id);
    const prepared = this.logins.prepare({ mode: input.credential, password: input.password });
    const { id, adopted } = await this.login(input, prepared.password);
    try {
      await this.store.upsertProfile({ id, ...chosen.choice, ...profileDefaults(input) });
      await this.linkRecord({ kind, input, profileId: id });
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
    return { user: toUserDetail(row), credential: issued };
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

  private async assertLinkable(kind: LinkKind, id: string): Promise<void> {
    const target = await this.store.linkTarget(kind, id);
    if (!target) throw badRequest('link_target_not_found');
    if (target.hasLogin) throw conflict('link_taken');
  }

  private async linkRecord(ctx: {
    kind: LinkKind | undefined;
    input: UserCreate;
    profileId: string;
  }): Promise<void> {
    const { kind, input, profileId } = ctx;
    if (!kind) return;
    if (input.new_teacher) {
      await this.store.createTeacher({
        profile_id: profileId,
        display_name_ar: input.new_teacher.display_name_ar,
        display_name_en: input.new_teacher.display_name_en ?? null,
        gender: input.new_teacher.gender,
        phone_e164: input.phone_e164 ?? null,
        tz: input.tz ?? 'Asia/Riyadh',
      });
      return;
    }
    if (input.linked_id && !(await this.store.link(kind, input.linked_id, profileId)))
      throw conflict('link_taken');
  }
}
