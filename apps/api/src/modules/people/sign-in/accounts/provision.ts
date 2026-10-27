import { FAMILY_EMAIL_DOMAIN } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { AuditService } from '../../../../common/audit/audit.service';
import { conflict, forbidden } from '../../../../common/http/errors';
import { AUTH_GATE, SUBJECT_STORE, type AuthGate, type GuardianRec, type NewProfile, type StudentRec, type SubjectStore } from '../sign-in.ports';

/** The synthetic, never-delivered auth email of a family login (docs/30 §2). */
export const familyEmail = (kind: 'g' | 's', id: string): string => `${kind}-${id}@${FAMILY_EMAIL_DOMAIN}`;

/**
 * Lazy accounts (docs/30 §2): the auth user + profile are made on the FIRST verified code, never at
 * registration, never in bulk. Exactly one profile per record: the link is written only while the
 * record has none; a lost race removes what this call made and uses the winner's.
 */
@Injectable()
export class Provisioner {
  constructor(
    @Inject(SUBJECT_STORE) private readonly subjects: SubjectStore,
    @Inject(AUTH_GATE) private readonly auth: AuthGate,
    private readonly audit: AuditService,
  ) {}

  /** The guardian's profile id (made now if missing). 409 phone_belongs_to_staff, 403 account_disabled. */
  async guardian(g: GuardianRec): Promise<string> {
    if (g.profileId) return this.usable(g.profileId);
    // A staff phone is a staff profile's own or its teacher row's (staffByPhone); any holder keeps the phone.
    if (await this.subjects.staffByPhone(g.phone)) throw conflict('phone_belongs_to_staff');
    const holder = await this.subjects.profileByPhone(g.phone);
    const profile = { role: 'guardian' as const, fullName: g.name, phone: holder ? null : g.phone, tz: g.tz };
    const made = await this.make({ email: familyEmail('g', g.id), profile, record: { kind: 'guardian', id: g.id } });
    if (made) return made;
    const again = await this.subjects.guardianByPhone(g.phone);
    if (!again?.profileId) throw new Error('guardian link lost');
    return this.usable(again.profileId);
  }

  /** A child's first password: the student login with the password they chose (never seen by staff). */
  async student(s: StudentRec, password: string): Promise<string | null> {
    const profile = { role: 'student' as const, fullName: s.name, phone: null, tz: s.tz };
    return this.make({ email: familyEmail('s', s.id), profile, record: { kind: 'student', id: s.id }, password });
  }

  /** 403 account_disabled for a disabled login (the existing refusal). */
  private async usable(profileId: string): Promise<string> {
    const p = await this.subjects.profileById(profileId);
    if (!p || p.disabled) throw forbidden('account_disabled');
    return p.id;
  }

  /** A login left by a failed attempt: whatever it held no longer opens it (as POST /users adopts one). */
  private async adopt(id: string, password: string | undefined): Promise<void> {
    if (password) await this.auth.setPassword(id, password);
    await this.auth.revokeSessions(id);
  }

  /** null = the record got a login from elsewhere meanwhile (what this call made is removed). */
  private async make(input: {
    email: string;
    profile: Omit<NewProfile, 'id'>;
    record: { kind: 'guardian' | 'student'; id: string };
    password?: string;
  }): Promise<string | null> {
    const { email, profile, record, password } = input;
    const left = await this.auth.idByEmail(email);
    const id = left ?? (await this.auth.createUser({ email, fullName: profile.fullName, ...(password && { password }) }));
    if (left) await this.adopt(left, password);
    try {
      const existing = await this.subjects.profileById(id);
      if (existing && existing.role !== profile.role) throw new Error('family login has another role');
      if (!existing) await this.subjects.insertProfile({ id, ...profile });
      if (!(await this.subjects.link({ kind: record.kind, recordId: record.id, profileId: id }))) {
        await this.auth.removeUser(id);
        return null;
      }
    } catch (e) {
      await this.auth.removeUser(id).catch(() => undefined);
      throw e;
    }
    await this.audit.record({ actorId: id, entity: 'auth', entityId: id, action: 'profile_provisioned', after: { role: profile.role, record: record.kind } });
    return id;
  }
}
