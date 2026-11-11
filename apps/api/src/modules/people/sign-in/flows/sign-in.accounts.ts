import { parseIdentifier, type CodeSession, type PasswordSession } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { Provisioner } from '@/modules/people/sign-in/accounts/provision';
import {
  AUTH_GATE,
  SUBJECT_STORE,
  type AuthGate,
  type GuardianRec,
  type SubjectStore,
  type TeacherRec,
} from '@/modules/people/sign-in/sign-in.ports';
import { invalidCode, type AuthEvent } from './sign-in.kit';
import type { PasswordTarget } from './targets';
import { teacherLoginId } from './teacher-destination';

type LoginKind = 'student' | 'username' | 'phone';

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

  teacherByPhone(phone: string): Promise<TeacherRec | null> {
    return this.subjects.teacherByPhone(phone);
  }

  /** The guardian's login (made at the first verified code) and its session. 401 invalid_code. */
  async guardianSession(guardian: GuardianRec): Promise<{ userId: string; session: CodeSession }> {
    return this.sessionOf(await this.provision.guardian(guardian));
  }

  /** The teacher's login (made at her first verified code, docs/46 A3) and its session. */
  async teacherSession(teacher: TeacherRec): Promise<{ userId: string; session: CodeSession }> {
    return this.sessionOf(await this.provision.teacher(teacher));
  }

  private async sessionOf(userId: string): Promise<{ userId: string; session: CodeSession }> {
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
   * Whose login a typed identifier names (a phone: a teacher's, through her record, docs/46 A5).
   */
  private readonly loginOf: Record<LoginKind, (value: string) => Promise<string | null>> = {
    student: async (code) => (await this.subjects.studentByCode(code))?.profileId ?? null,
    username: async (name) => (await this.subjects.profileByUsername(name))?.id ?? null,
    phone: async (phone) => teacherLoginId(await this.subjects.teacherByPhone(phone)),
  };

  /**
   * A student code → that student's login; a username → that profile; a phone → a teacher's login
   * (never staffByPhone: a number shared with a parent's login still finds the teacher). An email
   * is refused here: web and mobile send it straight to GoTrue, which then limits by the caller's
   * own IP (relayed from the API server, every guess would share one IP).
   */
  private async emailFor(raw: string): Promise<string | null> {
    const id = parseIdentifier(raw);
    if (!id || id.kind === 'email') return null;
    const profileId = await this.loginOf[id.kind](id.value);
    return profileId ? this.auth.emailOf(profileId) : null;
  }
}
