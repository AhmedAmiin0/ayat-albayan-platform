import { FAMILY_EMAIL_DOMAIN, type UserRole } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import { conflict, forbidden } from '@/common/http/errors';
import {
  AUTH_GATE,
  SUBJECT_STORE,
  type AuthGate,
  type GuardianRec,
  type ProfileRec,
  type StudentRec,
  type SubjectStore,
  type TeacherRec,
} from '@/modules/people/sign-in/sign-in.ports';
import { LoginMaker, type MakeInput } from './login-maker';

/** The synthetic, never-delivered auth email of a code-made login (docs/30 §2; `t`: docs/46 A3). */
export const familyEmail = (kind: 'g' | 's' | 't', id: string): string =>
  `${kind}-${id}@${FAMILY_EMAIL_DOMAIN}`;

/**
 * A staff number a guardian login may not share: any staff profile but a teacher's (docs/46 «Shared
 * numbers»: a teacher who is also a parent keeps both sign-ins; her login leaves the phone to the
 * family).
 */
export const blocksFamily = (holder: ProfileRec | null): boolean =>
  holder !== null && holder.role !== 'teacher';

/** A login the code may open: present, enabled and of the record's own role. */
const usableAs = (p: ProfileRec | null, role: UserRole): p is ProfileRec =>
  p !== null && !p.disabled && p.role === role;

const refused = (): never => {
  throw forbidden('account_disabled');
};

/**
 * Lazy accounts (docs/30 §2): the auth user + profile are made on the FIRST verified code, never at
 * registration, never in bulk. Exactly one profile per record: the link is written only while the
 * record has none; a lost race removes what THIS call created (never a login it found) and uses the
 * winner's.
 */
@Injectable()
export class Provisioner {
  constructor(
    @Inject(SUBJECT_STORE) private readonly subjects: SubjectStore,
    @Inject(AUTH_GATE) private readonly auth: AuthGate,
    private readonly audit: AuditService,
  ) {}


  /**
   * The guardian's profile id (made now if missing). 409 phone_belongs_to_staff, 403
   * account_disabled.
   */
  async guardian(g: GuardianRec): Promise<string> {
    if (g.profileId) return this.usable(g.profileId);
    // A staff phone is a staff profile's own or its teacher row's (staffByPhone); any holder keeps
    // the phone.
    if (blocksFamily(await this.subjects.staffByPhone(g.phone)))
      throw conflict('phone_belongs_to_staff');
    const holder = await this.subjects.profileByPhone(g.phone);
    const profile = {
      role: 'guardian' as const,
      fullName: g.name,
      phone: holder ? null : g.phone,
      tz: g.tz,
    };
    const made = await this.make({
      email: familyEmail('g', g.id),
      profile,
      record: { kind: 'guardian', id: g.id },
    });
    if (made) return made;
    const again = await this.subjects.guardianByPhone(g.phone);
    if (!again?.profileId) throw new Error('guardian link lost');
    return this.usable(again.profileId);
  }

  /**
   * A child's first password: the student login with the password they chose (never seen by staff).
   */
  async student(s: StudentRec, password: string): Promise<string | null> {
    const profile = { role: 'student' as const, fullName: s.name, phone: null, tz: s.tz };
    return this.make({
      email: familyEmail('s', s.id),
      profile,
      record: { kind: 'student', id: s.id },
      password,
    });
  }

  /**
   * The teacher's login (docs/46 A3), made at her first verified code. An existing login must be an
   * enabled `teacher` (else 403 account_disabled, said only after a right code). The new profile
   * takes the record's phone only while no profile and no guardian holds it («Shared numbers»).
   */
  async teacher(t: TeacherRec): Promise<string> {
    if (t.profileId) return this.teacherLogin(t.profileId);
    const profile = {
      role: 'teacher' as const,
      fullName: t.name,
      phone: await this.freePhone(t.recordPhone),
      tz: t.tz,
    };
    const made = await this.make({
      email: familyEmail('t', t.id),
      profile,
      record: { kind: 'teacher', id: t.id },
    });
    return made ?? refused();
  }

  /**
   * Never an admin / sales / family profile linked to a teacher row: a code opens teacher logins
   * only.
   */
  private async teacherLogin(profileId: string): Promise<string> {
    const login = await this.subjects.profileById(profileId);
    return usableAs(login, 'teacher') ? login.id : refused();
  }

  /** The number when nobody else holds it (a profile or a guardian row), else null. */
  private async freePhone(phone: string | null): Promise<string | null> {
    if (!phone) return null;
    const [profile, guardian] = await Promise.all([
      this.subjects.profileByPhone(phone),
      this.subjects.guardianByPhone(phone),
    ]);
    return profile || guardian ? null : phone;
  }

  /** 403 account_disabled for a disabled login (the existing refusal). */
  private async usable(profileId: string): Promise<string> {
    const p = await this.subjects.profileById(profileId);
    if (!p || p.disabled) throw forbidden('account_disabled');
    return p.id;
  }

  private make(input: MakeInput): Promise<string | null> {
    const { subjects, auth, audit } = this;
    return new LoginMaker({ subjects, auth, audit }).make(input);
  }
}
