import type { CodeRequest, CodeSession, CodeVerify } from '@ab/shared';
import { normalizePhone } from '@ab/core';
import { Injectable } from '@nestjs/common';
import type { FamilyLogin } from '@/modules/people/sign-in/sign-in.ports';
import { SignInAccounts } from './sign-in.accounts';
import { codesUnavailable, invalidCode, SignInKit } from './sign-in.kit';

/** The audit trail's `via` of a family code sign-in, per the login the number opened. */
const VIA = { guardian: 'phone', student: 'student_phone' } as const satisfies Record<
  FamilyLogin['kind'],
  string
>;

const subjectOf = (login: FamilyLogin) => ({ kind: login.kind, id: login.rec.id });

/**
 * The family's sign-in (docs/30 §1): a family number on file + a WhatsApp code. The family's main
 * or second number opens the guardian login, a student's own number the student's login.
 * The first verified code makes the login (lazy). The session is minted by GoTrue:
 * only the magic link's token hash leaves, and the client trades it with verifyOtp.
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

  /** Staff codes can go out (no family flag, docs/46 A1). */
  staff(): Promise<boolean> {
    return this.kit.staffAvailable();
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
   * account_disabled, 503 codes_unavailable. A code opens only with the number it was sent to
   * (the family's numbers share one subject).
   */
  async verify(body: CodeVerify, ip: string): Promise<CodeSession> {
    await this.kit.guard('check', { ip, identifier: body.phone });
    if (!(await this.available())) throw codesUnavailable();
    const login = await this.lookup(body.phone);
    const check = { purposes: ['sign_in'] as const, code: body.code, phone: login?.phone };
    if (!login || !(await this.kit.check({ subject: subjectOf(login), ...check }))) {
      throw invalidCode();
    }
    const { userId, session } = await this.accounts.familySession(login);
    await this.kit.record({ userId, action: 'code_sign_in', via: VIA[login.kind] });
    return session;
  }

  private async lookup(raw: string): Promise<FamilyLogin | null> {
    const phone = normalizePhone(raw);
    return phone.ok ? this.accounts.familyByPhone(phone.e164) : null;
  }

  /** The code goes to the matched number ON FILE: the typed number is only the lookup key. */
  private async send(raw: string): Promise<void> {
    const login = (await this.available()) ? await this.lookup(raw) : null;
    if (!login) return;
    await this.kit.issue({ purpose: 'sign_in', subject: subjectOf(login), phone: login.phone });
  }
}
