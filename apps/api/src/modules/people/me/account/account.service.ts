import { passwordProblem, type AccountProfile, type EmailChange, type PasswordChange, type ProfileUpdate } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { badRequest, conflict, notFound } from '@/common/http/errors';
import { AVATAR_FILES } from '@/common/storage/avatars/avatar-files';
import {
  ACCOUNT_AUTH,
  ACCOUNT_CONFIG,
  ACCOUNT_STORE,
  selfWritable,
  type AccountAuth,
  type AccountConfig,
  type AccountFiles,
  type AccountStore,
} from './account.ports';

/**
 * «حسابي» (R-ACC-01..04): the CALLER's own profile, never another id. Profile writes take the
 * whitelisted columns only (selfWritable); a phone, email or password change re-checks the current
 * password. Teacher, guardian and student rows (what families see) stay admin-managed.
 *
 * Logging: the global ActivityInterceptor writes one activity_log row per request, field NAMES
 * only, a refused password included (status 400). No audit_log row: its actor_id has no ON DELETE,
 * so a self-edit would make the login undeletable (DELETE /users/:id → users_has_history).
 */
@Injectable()
export class AccountService {
  constructor(
    @Inject(ACCOUNT_STORE) private readonly store: AccountStore,
    @Inject(ACCOUNT_AUTH) private readonly auth: AccountAuth,
    @Inject(AVATAR_FILES) private readonly files: AccountFiles,
    @Inject(ACCOUNT_CONFIG) private readonly config: AccountConfig,
  ) {}

  /** R-ACC-01. */
  async profile(user: AuthUser): Promise<AccountProfile> {
    const row = await this.store.get(user.id);
    if (!row) throw notFound('profile_not_found');
    const email = (await this.auth.emailOf(user.id)) ?? user.email;
    const avatar_url = row.avatar_path ? await this.files.url(row.avatar_path) : null;
    const avatar_seed = row.teacher_id ?? row.id;
    return { id: row.id, full_name: row.full_name, email, phone_e164: row.phone_e164, avatar_url, avatar_seed, role: row.role };
  }

  /** R-ACC-02: name and/or phone; 409 phone_taken. */
  async updateProfile(user: AuthUser, input: ProfileUpdate): Promise<AccountProfile> {
    const patch = selfWritable({ full_name: input.full_name, phone_e164: input.phone_e164 });
    if (patch.phone_e164 !== undefined) {
      await this.checkPassword(user, { password: input.current_password ?? '' });
      if (patch.phone_e164 !== null && (await this.store.phoneTaken(patch.phone_e164, user.id))) throw conflict('phone_taken');
    }
    await this.store.update(user.id, patch);
    return this.profile(user);
  }

  /** R-ACC-03: confirmed at once (staging has no SMTP); 409 email_taken. */
  async changeEmail(user: AuthUser, input: EmailChange): Promise<AccountProfile> {
    await this.checkPassword(user, { password: input.current_password });
    await this.auth.update(user.id, { email: input.email });
    return this.profile(user);
  }

  /**
   * R-ACC-04: the existing password rules (AUTH_PASSWORD_MIN_LENGTH). The current session stays;
   * every other one ends, and with it their devices' pushes (migration 700's session bindings).
   */
  async changePassword(user: AuthUser, input: PasswordChange): Promise<void> {
    const problem = passwordProblem(input.new_password, this.config.passwordMinLength);
    if (problem) throw badRequest(problem === 'too_long' ? 'password_too_long' : 'password_too_short');
    if (input.new_password === input.current_password) throw badRequest('password_same');
    await this.checkPassword(user, { password: input.current_password });
    await this.auth.update(user.id, { password: input.new_password });
    await this.auth.revokeOtherSessions({ userId: user.id, keep: user.sessionId ?? null });
  }

  /** 400 wrong_password unless the password signs the caller in. */
  private async checkPassword(user: AuthUser, input: { password: string }): Promise<void> {
    if (input.password === '') throw badRequest('password_required');
    const email = (await this.auth.emailOf(user.id)) ?? user.email;
    const ok = email !== null && (await this.auth.passwordMatches({ email, password: input.password }));
    if (!ok) throw badRequest('wrong_password');
  }

}
