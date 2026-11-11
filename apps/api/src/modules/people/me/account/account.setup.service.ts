import { isFamilyEmail, passwordProblem, type AccountSetup } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { badRequest, conflict } from '@/common/http/errors';
import {
  ACCOUNT_AUTH,
  ACCOUNT_CONFIG,
  ACCOUNT_STORE,
  type AccountAuth,
  type AccountConfig,
  type AccountStore,
} from './account.ports';

/**
 * A teacher's first-time setup (docs/46 A4): her login was made by a WhatsApp code with the
 * synthetic `t-<id>@family.invalid` email; she sets a real email and a password once, through the
 * Admin API (`email_confirm`, no SMTP). Never the client's `updateUser({ email })`.
 */
@Injectable()
export class AccountSetupService {
  constructor(
    @Inject(ACCOUNT_STORE) private readonly store: AccountStore,
    @Inject(ACCOUNT_AUTH) private readonly auth: AccountAuth,
    @Inject(ACCOUNT_CONFIG) private readonly config: AccountConfig,
  ) {}

  /**
   * 204. 409 setup_done unless the caller is a teacher still on the synthetic email; 400
   *      password_*; 409 email_taken. Every other session ends; the client refreshes its own (the
   *      JWT's email).
   */
  async setup(user: AuthUser, input: AccountSetup): Promise<void> {
    const problem = passwordProblem(input.password, this.config.passwordMinLength);
    if (problem) throw badRequest(`password_${problem}`, { min: this.config.passwordMinLength });
    if (!(await this.pending(user.id))) throw conflict('setup_done');
    await this.auth.update(user.id, { email: input.email, password: input.password });
    await this.auth.revokeOtherSessions({ userId: user.id, keep: user.sessionId ?? null });
  }

  /**
   * The profile's role (never the token's claim) is teacher and the auth email is still synthetic.
   */
  private async pending(id: string): Promise<boolean> {
    const [row, email] = await Promise.all([this.store.get(id), this.auth.emailOf(id)]);
    return row?.role.base === 'teacher' && isFamilyEmail(email);
  }
}
