import { parseIdentifier, type CodeSession, type PasswordSession } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { Provisioner } from '@/modules/people/sign-in/accounts/provision';
import {
  AUTH_GATE,
  SUBJECT_STORE,
  type AuthGate,
  type GuardianRec,
  type SubjectStore,
} from '@/modules/people/sign-in/sign-in.ports';
import { invalidCode, type AuthEvent } from './sign-in.kit';
import type { PasswordTarget } from './targets';

/** The account side of the sign-in flows: the records, GoTrue and lazy provisioning. */
@Injectable()
export class SignInAccounts {
  constructor(
    @Inject(SUBJECT_STORE) private readonly subjects: SubjectStore,
    @Inject(AUTH_GATE) private readonly auth: AuthGate,
    private readonly provision: Provisioner,
  ) {}

  guardianByPhone(phone: string): Promise<GuardianRec | null> {
    return this.subjects.guardianByPhone(phone);
  }

  /** The guardian's login (made at the first verified code) and its session. 401 invalid_code. */
  async guardianSession(guardian: GuardianRec): Promise<{ userId: string; session: CodeSession }> {
    const userId = await this.provision.guardian(guardian);
    const email = await this.auth.emailOf(userId);
    if (!email) throw invalidCode();
    return { userId, session: await this.auth.magicLink(email) };
  }

  /** The session of a username / student-code sign-in, null for any failure. */
  async passwordSession(username: string, password: string): Promise<PasswordSession | null> {
    const email = await this.emailFor(username);
    return email ? this.auth.signIn({ email, password }) : null;
  }

  /**
   * The new password on the target's login (signed out everywhere), or a student's first login.
   * 401 invalid_code when there is nothing to set. Returns the audit event to record.
   */
  async setPassword(target: PasswordTarget, password: string): Promise<AuthEvent> {
    const existing = target.kind === 'staff' ? target.profile.id : target.student.profileId;
    if (existing) {
      await this.auth.setPassword(existing, password);
      await this.auth.revokeSessions(existing);
      return { userId: existing, action: 'password_reset', via: target.kind };
    }
    if (target.kind !== 'student') throw invalidCode();
    const made = await this.provision.student(target.student, password);
    if (!made) throw invalidCode();
    return { userId: made, action: 'password_set', via: 'student' };
  }

  /**
   * A student code → that student's login; a username → that profile. An email is refused here:
   * web and mobile send it straight to GoTrue, which then limits by the caller's own IP (relayed
   * from the API server, every guess would share one IP). A phone never signs in with a password.
   */
  private async emailFor(raw: string): Promise<string | null> {
    const id = parseIdentifier(raw);
    if (!id || id.kind === 'phone' || id.kind === 'email') return null;
    const profileId =
      id.kind === 'student'
        ? ((await this.subjects.studentByCode(id.value))?.profileId ?? null)
        : ((await this.subjects.profileByUsername(id.value))?.id ?? null);
    return profileId ? this.auth.emailOf(profileId) : null;
  }
}
