import { normalizePhone, type CodeRequest, type CodeSession, type CodeVerify } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { TeacherRec } from '@/modules/people/sign-in/sign-in.ports';
import { SignInAccounts } from './sign-in.accounts';
import { codesUnavailable, invalidCode, SignInKit } from './sign-in.kit';
import { teacherCodePhone } from './teacher-destination';

/**
 * A teacher's WhatsApp-code sign-in (docs/46 A2, D2), mirroring FamilyCodeService: the typed phone
 * is only a lookup key, the code goes to the record's phone while she has no login, else to her
 * login's own phone. The first verified code makes her `teacher` login (A3); setup follows (A4).
 */
@Injectable()
export class TeacherCodeService {
  constructor(
    private readonly kit: SignInKit,
    private readonly accounts: SignInAccounts,
  ) {}

  /**
   * 202 whatever exists (lookup + send run after the answer, SignInKit.answerFirst); 429 past a
   * limit.
   */
  request(body: CodeRequest, ip: string): Promise<void> {
    return this.kit.answerFirst({ ip, phone: body.phone }, (phone) => this.send(phone));
  }

  /**
   * 401 invalid_code (one answer for every failure), 403 account_disabled, 503 codes_unavailable.
   */
  async verify(body: CodeVerify, ip: string): Promise<CodeSession> {
    await this.kit.guard('check', { ip, identifier: body.phone });
    if (!(await this.kit.staffAvailable())) throw codesUnavailable();
    const teacher = await this.lookup(body.phone);
    const check = { purposes: ['sign_in'] as const, code: body.code };
    if (!teacher || !(await this.kit.check({ subject: subjectOf(teacher), ...check }))) {
      throw invalidCode();
    }
    const { userId, session } = await this.accounts.teacherSession(teacher);
    await this.kit.record({ userId, action: 'code_sign_in', via: 'teacher_phone' });
    return session;
  }

  private async lookup(raw: string): Promise<TeacherRec | null> {
    const phone = normalizePhone(raw);
    return phone.ok ? this.accounts.teacherByPhone(phone.e164) : null;
  }

  private async send(raw: string): Promise<void> {
    const teacher = (await this.kit.staffAvailable()) ? await this.lookup(raw) : null;
    const phone = teacher ? teacherCodePhone(teacher) : null;
    if (!teacher || !phone) return;
    await this.kit.issue({ purpose: 'sign_in', subject: subjectOf(teacher), phone });
  }
}

const subjectOf = (t: TeacherRec) => ({ kind: 'teacher' as const, id: t.id });
