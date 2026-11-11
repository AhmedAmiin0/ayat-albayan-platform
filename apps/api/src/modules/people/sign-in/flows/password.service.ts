import {
  passwordProblem,
  type ForgotBody,
  type LoginBody,
  type PasswordSession,
  type ResetBody,
} from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { badRequest } from '@/common/http/errors';
import { SignInAccounts } from './sign-in.accounts';
import { codesUnavailable, invalidCode, invalidCredentials, SignInKit } from './sign-in.kit';
import { PasswordTargets, type PasswordTarget } from './targets';

/**
 * Which send check a target's code needs (docs/46 A1): staff codes go out whenever codes can be
 * sent; a student's (the family side) also needs family_login_enabled.
 */
const CODES_OPEN: Record<PasswordTarget['kind'], (kit: SignInKit) => Promise<boolean>> = {
  staff: (kit) => kit.staffAvailable(),
  student: (kit) => kit.available(),
};

/**
 * Passwords (docs/30 §1, §6): username sign-in (a student's code or a teacher's username; an email
 * still works), forgot (a code to the phone on file) and reset (a child's first password is a reset
 * too, purpose set_password). One generic failure each: 401 invalid_credentials / invalid_code.
 */
@Injectable()
export class PasswordService {
  constructor(
    private readonly kit: SignInKit,
    private readonly accounts: SignInAccounts,
    private readonly targets: PasswordTargets,
  ) {}

  /** The session for supabase.auth.setSession, signed in on an isolated client. */
  async login(body: LoginBody, ip: string): Promise<PasswordSession> {
    await this.kit.guard('login', { ip, identifier: body.username });
    const session = await this.accounts.passwordSession(body.username, body.password);
    if (!session) throw invalidCredentials();
    return session;
  }

  /** Always 202, whatever exists; the code goes to the account's own phone after the answer. */
  async forgot(body: ForgotBody, ip: string): Promise<void> {
    await this.kit.guard('request', { ip, identifier: body.identifier });
    this.kit.later(async () => {
      const target = await this.openTarget(body.identifier);
      if (target) await this.kit.issue(target.code);
    });
  }

  /**
   * 204. 400 password_* before the code is touched; 401 invalid_code; 503 codes_unavailable. Signs
   * out everywhere.
   */
  async reset(body: ResetBody, ip: string, min: number): Promise<void> {
    await this.kit.guard('check', { ip, identifier: body.identifier });
    const problem = passwordProblem(body.password, min);
    if (problem) throw badRequest(`password_${problem}`, { min });
    if (!(await this.kit.staffAvailable())) throw codesUnavailable();
    const target = await this.openTarget(body.identifier);
    if (!target) throw invalidCode();
    const ok = await this.kit.check({
      subject: target.code.subject,
      purposes: ['reset_password', 'set_password'],
      code: body.code,
    });
    if (!ok) throw invalidCode();
    await this.kit.record(await this.accounts.setPassword(target, body.password));
  }

  /** The identifier's target while its codes can go out, else null (one answer for both). */
  private async openTarget(identifier: string): Promise<PasswordTarget | null> {
    const target = (await this.kit.staffAvailable())
      ? await this.targets.resolve(identifier)
      : null;
    return target && (await CODES_OPEN[target.kind](this.kit)) ? target : null;
  }
}
