import { parseIdentifier } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { AUTH_GATE, isStaff, SUBJECT_STORE, type AuthGate, type ProfileRec, type StudentRec, type SubjectStore } from '../sign-in.ports';
import type { CodeTarget } from '../codes/code-issuer';

/** Whose password a forgot / reset identifier names, and where its code goes (a phone ON FILE only). */
export type PasswordTarget =
  | { kind: 'staff'; profile: ProfileRec; code: CodeTarget }
  | { kind: 'student'; student: StudentRec; code: CodeTarget };

/**
 * Resolves a typed identifier (email | username | student code | phone) to an account and the phone on
 * file. A typed phone is only a lookup key: the code goes to the account's own phone. Family profiles
 * are reached by student code only (a guardian has no password); a disabled login gets nothing.
 */
@Injectable()
export class PasswordTargets {
  constructor(
    @Inject(SUBJECT_STORE) private readonly subjects: SubjectStore,
    @Inject(AUTH_GATE) private readonly auth: AuthGate,
  ) {}

  async resolve(raw: string): Promise<PasswordTarget | null> {
    const id = parseIdentifier(raw);
    if (!id) return null;
    if (id.kind === 'student') return this.student(id.value);
    const profile = await this.staff(id);
    if (!profile?.phone || profile.disabled || !isStaff(profile.role)) return null;
    return { kind: 'staff', profile, code: { purpose: 'reset_password', subject: { kind: 'profile', id: profile.id }, phone: profile.phone } };
  }

  private async student(code: string): Promise<PasswordTarget | null> {
    const student = await this.subjects.studentByCode(code);
    if (!student) return null;
    if (student.profileId) {
      const login = await this.subjects.profileById(student.profileId);
      if (!login || login.disabled) return null;
    }
    const purpose = student.profileId ? 'reset_password' : 'set_password';
    return { kind: 'student', student, code: { purpose, subject: { kind: 'student', id: student.id }, phone: student.guardianPhone } };
  }

  private async staff(id: { kind: 'email' | 'phone' | 'username'; value: string }): Promise<ProfileRec | null> {
    if (id.kind === 'username') return this.subjects.profileByUsername(id.value);
    if (id.kind === 'phone') return this.subjects.staffByPhone(id.value);
    const userId = await this.auth.idByEmail(id.value);
    return userId ? this.subjects.profileById(userId) : null;
  }
}
