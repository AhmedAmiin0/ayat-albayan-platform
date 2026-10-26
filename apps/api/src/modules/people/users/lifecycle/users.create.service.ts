import type { LinkKind, UserCreate, UserWithCredential } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { badRequest, conflict, notFound } from '../../../../common/http/errors';
import { recordUser } from '../users.audit';
import { prepareCredential, withLink } from '../auth/users.credential';
import { chooseRole } from '../users.logic';
import { toUserDetail } from '../users.mapper';
import { generatePassword } from '../auth/users.password';
import { UserEffects, UserPorts } from '../users.ports';
import { assertMayAssign, type Actor } from '../users.rules';

/** Roles whose login belongs to an existing teachers / students / guardians row. */
const LINK_KIND: Partial<Record<UserCreate['role'], LinkKind>> = { teacher: 'teacher', student: 'student', guardian: 'guardian' };

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
    private readonly ports: UserPorts,
    private readonly effects: UserEffects,
  ) {}

  /** 403 permission_not_held / system_admin_only / admin_role_only, 409 email_taken / link_taken, 400 password_* / link_target_not_found / unknown_role / role_mismatch. */
  async create(input: UserCreate, actor: Actor): Promise<UserWithCredential> {
    const state = await this.ports.access.state();
    const chosen = chooseRole(state.roles, input);
    if (typeof chosen === 'string' || chosen === null) throw badRequest(chosen ?? 'unknown_role');
    assertMayAssign(actor, state, chosen.record);
    const kind = LINK_KIND[input.role];
    if (kind && input.linked_id) await this.assertLinkable(kind, input.linked_id);
    const prepared = prepareCredential({ mode: input.credential, password: input.password, min: this.effects.config.passwordMinLength });
    const { id, adopted } = await this.login(input, prepared.password);
    try {
      await this.ports.store.upsertProfile({ id, ...chosen.choice, ...profileDefaults(input) });
      await this.linkRecord({ kind, input, profileId: id });
    } catch (e) {
      if (!adopted) await this.ports.auth.remove(id);
      throw e;
    }
    const issued = await withLink(this.ports.auth, { email: input.email, prepared, mode: input.credential });
    const row = await this.ports.store.get(id);
    if (!row) throw notFound('user_not_found');
    await recordUser(this.effects.audit, { actorId: actor.id, userId: id, action: 'create', after: row, extra: { credential_mode: input.credential } });
    return { user: toUserDetail(row), credential: issued };
  }

  /**
   * The auth user: new, or one left without a profile by a failed attempt (idempotent retry). An
   * adopted login is refreshed like a new one (confirmed email, name) and gets a password of this
   * request (a random one in link mode) with its sessions revoked: whatever the failed attempt or its
   * owner left behind no longer opens it.
   */
  private async login(input: UserCreate, password: string | undefined): Promise<{ id: string; adopted: boolean }> {
    const existing = await this.ports.auth.findIdByEmail(input.email);
    if (!existing) return { id: await this.ports.auth.create({ email: input.email, password, fullName: input.full_name }), adopted: false };
    if (await this.ports.store.profile(existing)) throw conflict('email_taken');
    const fresh = password ?? generatePassword(this.effects.config.passwordMinLength);
    await this.ports.auth.update(existing, { password: fresh, fullName: input.full_name, confirmEmail: true });
    await this.ports.auth.revokeSessions(existing);
    return { id: existing, adopted: true };
  }

  private async assertLinkable(kind: LinkKind, id: string): Promise<void> {
    const target = await this.ports.store.linkTarget(kind, id);
    if (!target) throw badRequest('link_target_not_found');
    if (target.hasLogin) throw conflict('link_taken');
  }

  private async linkRecord(ctx: { kind: LinkKind | undefined; input: UserCreate; profileId: string }): Promise<void> {
    const { kind, input, profileId } = ctx;
    if (!kind) return;
    if (input.new_teacher) {
      await this.ports.store.createTeacher({
        profile_id: profileId,
        display_name_ar: input.new_teacher.display_name_ar,
        display_name_en: input.new_teacher.display_name_en ?? null,
        gender: input.new_teacher.gender,
        phone_e164: input.phone_e164 ?? null,
        tz: input.tz ?? 'Asia/Riyadh',
      });
      return;
    }
    if (input.linked_id && !(await this.ports.store.link(kind, input.linked_id, profileId))) throw conflict('link_taken');
  }
}
