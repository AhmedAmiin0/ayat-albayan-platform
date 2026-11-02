import type { CredentialMode, IssuedCredential } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { prepareCredential, withLink, type PreparedCredential } from './users.credential';
import { generatePassword } from './users.password';
import {
  AUTH_ADMIN,
  USERS_CONFIG,
  type AuthAdmin,
  type AuthPatch,
  type UsersConfig,
} from '@/modules/people/users/store/users.store';

interface CredentialInput {
  mode: CredentialMode;
  password?: string | undefined;
}

interface IssueInput {
  email: string;
  prepared: PreparedCredential;
  mode: CredentialMode;
}

/** The logins of the users services: the Auth Admin API under the academy's password policy. */
@Injectable()
export class UserLogins {
  constructor(
    @Inject(AUTH_ADMIN) private readonly admin: AuthAdmin,
    @Inject(USERS_CONFIG) private readonly config: UsersConfig,
  ) {}

  findIdByEmail(email: string): Promise<string | null> {
    return this.admin.findIdByEmail(email);
  }

  create(input: Parameters<AuthAdmin['create']>[0]): Promise<string> {
    return this.admin.create(input);
  }

  update(id: string, patch: AuthPatch): Promise<void> {
    return this.admin.update(id, patch);
  }

  remove(id: string): Promise<void> {
    return this.admin.remove(id);
  }

  revokeSessions(id: string): Promise<void> {
    return this.admin.revokeSessions(id);
  }

  /** 400 password_blank / password_too_short / password_too_long for a typed password. */
  prepare(input: CredentialInput): PreparedCredential {
    return prepareCredential({ ...input, min: this.config.passwordMinLength });
  }

  /** A random password of the minimum length (an adopted login in link mode). */
  fresh(): string {
    return generatePassword(this.config.passwordMinLength);
  }

  /** What the admin sees once: the generated password, or a recovery link in link mode. */
  issue(ctx: IssueInput): Promise<IssuedCredential | null> {
    return withLink(this.admin, ctx);
  }
}
