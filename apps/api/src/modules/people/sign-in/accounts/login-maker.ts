import type { AuditService } from '@/common/audit/audit.service';
import type {
  AuthGate,
  LinkKind,
  NewProfile,
  SubjectStore,
} from '@/modules/people/sign-in/sign-in.ports';

export interface MakeInput {
  email: string;
  profile: Omit<NewProfile, 'id'>;
  record: { kind: LinkKind; id: string };
  password?: string;
}

interface MakerPorts {
  subjects: SubjectStore;
  auth: AuthGate;
  audit: AuditService;
}

/**
 * The auth user + profile + link of one lazy login (docs/30 §2). Exactly one profile per record:
 * the link is written only while the record has none. A lost race or a failure removes a user THIS
 * call created, never one it found (a login left by an earlier attempt, or anyone's real login).
 */
export class LoginMaker {
  constructor(private readonly ports: MakerPorts) {}

  /** null = the record got a login from elsewhere meanwhile. */
  async make(input: MakeInput): Promise<string | null> {
    const left = await this.ports.auth.idByEmail(input.email);
    const id = left ?? (await this.create(input));
    if (left) await this.adopt(left, input.password);
    const drop = () => (left ? Promise.resolve() : this.ports.auth.removeUser(id));
    const linked = await this.attach(id, input).catch(async (e: unknown) => {
      await drop().catch(() => undefined);
      throw e;
    });
    if (!linked) return drop().then(() => null);
    await this.provisioned(id, input);
    return id;
  }

  /** The profile (made unless it exists with this role) and the link; false = a lost race. */
  private async attach(id: string, input: MakeInput): Promise<boolean> {
    const { subjects } = this.ports;
    const existing = await subjects.profileById(id);
    if (existing && existing.role !== input.profile.role) {
      throw new Error('code login has another role');
    }
    if (!existing) await subjects.insertProfile({ id, ...input.profile });
    return subjects.link({ kind: input.record.kind, recordId: input.record.id, profileId: id });
  }

  private create(input: MakeInput): Promise<string> {
    const { email, profile, password } = input;
    return this.ports.auth.createUser({
      email,
      fullName: profile.fullName,
      ...(password && { password }),
    });
  }

  /**
   * A login left by a failed attempt: whatever it held no longer opens it (as POST /users adopts
   * one).
   */
  private async adopt(id: string, password: string | undefined): Promise<void> {
    if (password) await this.ports.auth.setPassword(id, password);
    await this.ports.auth.revokeSessions(id);
  }

  private provisioned(id: string, input: MakeInput): Promise<void> {
    const after = { role: input.profile.role, record: input.record.kind };
    return this.ports.audit.record({
      actorId: id,
      entity: 'auth',
      entityId: id,
      action: 'profile_provisioned',
      after,
    });
  }
}
