import { Inject, Injectable } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import {
  AUTH_GATE,
  SUBJECT_STORE,
  type AuthGate,
  type StudentRec,
  type SubjectStore,
} from '@/modules/people/sign-in/sign-in.ports';
import { LoginMaker } from './login-maker';
import { familyEmail, refused, usableAs } from './provision';

/**
 * A student's WhatsApp-code sign-in (owner 2026-11-17): the student's own login, the same one a
 * first password makes (s-<id>@family.invalid, Provisioner.student), so a child who signs in both
 * ways has one login. Made at the first verified code, without a password and without a phone on
 * the profile (the number stays in guardian_phones). An existing login must be an enabled
 * `student`, else 403 account_disabled (said only after a right code); a lost race is a 403 too.
 */
@Injectable()
export class StudentLogins {
  constructor(
    @Inject(SUBJECT_STORE) private readonly subjects: SubjectStore,
    @Inject(AUTH_GATE) private readonly auth: AuthGate,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async forCode(s: StudentRec): Promise<string> {
    if (s.profileId) return this.existing(s.profileId);
    const { subjects, auth, audit } = this;
    const made = await new LoginMaker({ subjects, auth, audit }).make({
      email: familyEmail('s', s.id),
      profile: { role: 'student', fullName: s.name, phone: null, tz: s.tz },
      record: { kind: 'student', id: s.id },
    });
    return made ?? refused();
  }

  private async existing(profileId: string): Promise<string> {
    const login = await this.subjects.profileById(profileId);
    return usableAs(login, 'student') ? login.id : refused();
  }
}
