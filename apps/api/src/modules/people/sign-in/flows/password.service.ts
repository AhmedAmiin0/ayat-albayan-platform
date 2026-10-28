import { parseIdentifier, passwordProblem, type ForgotBody, type LoginBody, type PasswordSession, type ResetBody } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { badRequest } from '../../../../common/http/errors';
import { AccountKit, codesUnavailable, invalidCode, invalidCredentials, SignInKit } from './sign-in.kit';
import { PasswordTargets, type PasswordTarget } from './targets';

/**
 * Passwords (docs/30 §1, §6): username sign-in (a student's code or a teacher's username; an email still
 * works), forgot (a code to the phone on file) and reset (a child's first password is a reset too,
 * purpose set_password). One generic failure each: 401 invalid_credentials / invalid_code.
 */
@Injectable()
export class PasswordService {
  constructor(
    private readonly kit: SignInKit,
    private readonly accounts: AccountKit,
    private readonly targets: PasswordTargets,
  ) {}

  /** The session for supabase.auth.setSession, signed in on an isolated client. */
  async login(body: LoginBody, ip: string): Promise<PasswordSession> {
    await this.kit.limits.assert('login', { ip, identifier: body.username });
    const email = await this.emailFor(body.username);
    const session = email ? await this.accounts.auth.signIn({ email, password: body.password }) : null;
    if (!session) throw invalidCredentials();
    return session;
  }

  /** Always 202, whatever exists; the code goes to the account's own phone after the answer. */
  async forgot(body: ForgotBody, ip: string): Promise<void> {
    await this.kit.limits.assert('request', { ip, identifier: body.identifier });
    this.kit.later(async () => {
      if (!(await this.kit.codes.available())) return;
      const target = await this.targets.resolve(body.identifier);
      if (target) await this.kit.issue(target.code);
    });
  }

  /** 204. 400 password_* before the code is touched; 401 invalid_code; 503 codes_unavailable. Signs out everywhere. */
  async reset(body: ResetBody, ip: string, min: number): Promise<void> {
    await this.kit.limits.assert('check', { ip, identifier: body.identifier });
    const problem = passwordProblem(body.password, min);
    if (problem) throw badRequest(`password_${problem}`, { min });
    if (!(await this.kit.codes.available())) throw codesUnavailable();
    const target = await this.targets.resolve(body.identifier);
    if (!target) throw invalidCode();
    const ok = await this.kit.codes.check({ subject: target.code.subject, purposes: ['reset_password', 'set_password'], code: body.code });
    if (!ok) throw invalidCode();
    await this.apply(target, body.password);
  }

  private async apply(target: PasswordTarget, password: string): Promise<void> {
    const existing = target.kind === 'staff' ? target.profile.id : target.student.profileId;
    if (existing) {
      await this.accounts.auth.setPassword(existing, password);
      await this.accounts.auth.revokeSessions(existing);
      await this.kit.record({ userId: existing, action: 'password_reset', via: target.kind });
      return;
    }
    if (target.kind !== 'student') throw invalidCode();
    const made = await this.accounts.provision.student(target.student, password);
    if (!made) throw invalidCode();
    await this.kit.record({ userId: made, action: 'password_set', via: 'student' });
  }

  /**
   * A student code → that student's login; a username → that profile. An email is refused here: web and
   * mobile send it straight to GoTrue, which then limits by the caller's own IP (relayed from the API
   * server, every guess would share one IP). A phone never signs in with a password.
   */
  private async emailFor(raw: string): Promise<string | null> {
    const id = parseIdentifier(raw);
    if (!id || id.kind === 'phone' || id.kind === 'email') return null;
    const profileId =
      id.kind === 'student'
        ? ((await this.accounts.subjects.studentByCode(id.value))?.profileId ?? null)
        : ((await this.accounts.subjects.profileByUsername(id.value))?.id ?? null);
    return profileId ? this.accounts.auth.emailOf(profileId) : null;
  }
}
