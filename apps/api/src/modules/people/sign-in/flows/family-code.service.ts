import { normalizePhone, type CodeRequest, type CodeSession, type CodeVerify } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { SignInAccounts } from './sign-in.accounts';
import { codesUnavailable, invalidCode, SignInKit } from './sign-in.kit';

/**
 * The family's sign-in (docs/30 §1): the guardian row's phone + a WhatsApp code. The first verified
 * code makes the guardian login (lazy). The session is minted by GoTrue: only the magic link's
 * token hash leaves, and the client trades it with verifyOtp.
 */
@Injectable()
export class FamilyCodeService {
  constructor(
    private readonly kit: SignInKit,
    private readonly accounts: SignInAccounts,
  ) {}

  async available(): Promise<boolean> {
    return this.kit.available();
  }

  /**
   * Always 202, whatever exists: the lookup and the send run after the answer. 429 past a limit.
   */
  async request(body: CodeRequest, ip: string): Promise<void> {
    await this.kit.guard('request', { ip, identifier: body.phone });
    this.kit.later(() => this.send(body.phone));
  }

  /**
   * 401 invalid_code (one message for every failure), 409 phone_belongs_to_staff, 403
   * account_disabled, 503 codes_unavailable.
   */
  async verify(body: CodeVerify, ip: string): Promise<CodeSession> {
    await this.kit.guard('check', { ip, identifier: body.phone });
    if (!(await this.available())) throw codesUnavailable();
    const phone = normalizePhone(body.phone);
    const guardian = phone.ok ? await this.accounts.guardianByPhone(phone.e164) : null;
    if (!guardian) throw invalidCode();
    const ok = await this.kit.check({
      subject: { kind: 'guardian', id: guardian.id },
      purposes: ['sign_in'],
      code: body.code,
    });
    if (!ok) throw invalidCode();
    const { userId, session } = await this.accounts.guardianSession(guardian);
    await this.kit.record({ userId, action: 'code_sign_in', via: 'phone' });
    return session;
  }

  /** The code goes to the guardian row's own phone: the typed number is only the lookup key. */
  private async send(raw: string): Promise<void> {
    const phone = normalizePhone(raw);
    if (!phone.ok || !(await this.available())) return;
    const guardian = await this.accounts.guardianByPhone(phone.e164);
    if (!guardian) return;
    await this.kit.issue({
      purpose: 'sign_in',
      subject: { kind: 'guardian', id: guardian.id },
      phone: guardian.phone,
    });
  }
}
