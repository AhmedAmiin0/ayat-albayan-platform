import { passwordProblem, type AccountProfile, type EmailChange, type PasswordChange, type ProfileUpdate } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import type { AuthUser } from '../../common/auth/verify-token';
import { badRequest, conflict, notFound } from '../scheduling/errors';
import { recordAccount, type AccountAction } from './account.audit';
import { AccountPorts } from './account.ports.provider';
import { ACCOUNT_CONFIG, selfWritable, type AccountConfig } from './account.ports';

/**
 * «حسابي» (R-ACC-01..04): the CALLER's own profile, never another id. Profile writes take the
 * whitelisted columns only (selfWritable); a phone, email or password change re-checks the current
 * password. Teacher, guardian and student rows (what families see) stay admin-managed.
 */
@Injectable()
export class AccountService {
  constructor(
    private readonly ports: AccountPorts,
    private readonly audit: AuditService,
    @Inject(ACCOUNT_CONFIG) private readonly config: AccountConfig,
  ) {}

  /** R-ACC-01. */
  async profile(user: AuthUser): Promise<AccountProfile> {
    const row = await this.ports.store.get(user.id);
    if (!row) throw notFound('profile_not_found');
    const email = (await this.ports.auth.emailOf(user.id)) ?? user.email;
    const avatar_url = row.avatar_path ? await this.ports.files.url(row.avatar_path) : null;
    return { id: row.id, full_name: row.full_name, email, phone_e164: row.phone_e164, avatar_url, role: row.role };
  }

  /** R-ACC-02: name and/or phone; 409 phone_taken. */
  async updateProfile(user: AuthUser, input: ProfileUpdate): Promise<AccountProfile> {
    const patch = selfWritable({ full_name: input.full_name, phone_e164: input.phone_e164 });
    if (patch.phone_e164 !== undefined) {
      await this.checkPassword(user, { password: input.current_password ?? '', field: 'phone_e164' });
      if (patch.phone_e164 !== null && (await this.ports.store.phoneTaken(patch.phone_e164, user.id))) throw conflict('phone_taken');
    }
    await this.ports.store.update(user.id, patch);
    await this.record(user, { action: 'profile_update', fields: Object.keys(patch) });
    return this.profile(user);
  }

  /** R-ACC-03: confirmed at once (staging has no SMTP); 409 email_taken. */
  async changeEmail(user: AuthUser, input: EmailChange): Promise<AccountProfile> {
    await this.checkPassword(user, { password: input.current_password, field: 'email' });
    await this.ports.auth.update(user.id, { email: input.email });
    await this.record(user, { action: 'email_change', fields: ['email'] });
    return this.profile(user);
  }

  /** R-ACC-04: the existing password rules (AUTH_PASSWORD_MIN_LENGTH); the current session stays. */
  async changePassword(user: AuthUser, input: PasswordChange): Promise<void> {
    const problem = passwordProblem(input.new_password, this.config.passwordMinLength);
    if (problem) throw badRequest(problem === 'too_long' ? 'password_too_long' : 'password_too_short');
    if (input.new_password === input.current_password) throw badRequest('password_same');
    await this.checkPassword(user, { password: input.current_password, field: 'password' });
    await this.ports.auth.update(user.id, { password: input.new_password });
    await this.record(user, { action: 'password_change', fields: ['password'] });
  }

  /** 400 wrong_password (and an audit row naming the field it guarded) unless the password signs in. */
  private async checkPassword(user: AuthUser, input: { password: string; field: string }): Promise<void> {
    if (input.password === '') throw badRequest('password_required');
    const email = (await this.ports.auth.emailOf(user.id)) ?? user.email;
    const ok = email !== null && (await this.ports.auth.passwordMatches({ email, password: input.password }));
    if (ok) return;
    await this.record(user, { action: 'wrong_password', fields: [input.field] });
    throw badRequest('wrong_password');
  }

  private record(user: AuthUser, e: { action: AccountAction; fields: readonly string[] }): Promise<void> {
    return recordAccount(this.audit, { userId: user.id, ...e });
  }
}
