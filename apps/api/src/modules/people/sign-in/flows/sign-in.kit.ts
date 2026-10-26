import { HttpException, HttpStatus, Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuditService } from '../../../../common/audit/audit.service';
import { Provisioner } from '../accounts/provision';
import { CodeIssuer } from '../codes/code-issuer';
import { SignInLimits } from '../codes/code-limits';
import { AUTH_GATE, SUBJECT_STORE, type AuthGate, type SubjectStore } from '../sign-in.ports';

export const invalidCode = () => new UnauthorizedException({ code: 'invalid_code', message: 'invalid_code' });
export const invalidCredentials = () => new UnauthorizedException({ code: 'invalid_credentials', message: 'invalid_credentials' });
export const codesUnavailable = () =>
  new HttpException({ code: 'codes_unavailable', message: 'codes_unavailable' }, HttpStatus.SERVICE_UNAVAILABLE);

/** One sign-in / password event in audit_log (entity `auth`). Never a code, a hash or a password. */
export interface AuthEvent {
  userId: string;
  action: 'code_sign_in' | 'password_set' | 'password_reset';
  via: string;
}

/**
 * The codes, the limits and the audit trail of the sign-in flows (rule 2: at most 3 parameters), plus
 * the after-response runner: lookups and the WhatsApp send of a 202 route run after the answer, so
 * neither the answer nor its timing tells whether the account exists.
 */
@Injectable()
export class SignInKit {
  private readonly log = new Logger(SignInKit.name);
  private readonly running = new Set<Promise<void>>();

  constructor(
    readonly codes: CodeIssuer,
    readonly limits: SignInLimits,
    private readonly audit: AuditService,
  ) {}

  later(task: () => Promise<unknown>): void {
    const run: Promise<void> = task()
      .then(() => undefined)
      .catch((e: unknown) => this.log.error(`sign-in background task: ${e instanceof Error ? e.message : String(e)}`))
      .finally(() => this.running.delete(run));
    this.running.add(run);
  }

  /** Resolves once every task started so far is done (tests, shutdown). */
  async idle(): Promise<void> {
    await Promise.all([...this.running]);
  }

  record(event: AuthEvent): Promise<void> {
    return this.audit.record({ actorId: event.userId, entity: 'auth', entityId: event.userId, action: event.action, after: { via: event.via } });
  }
}

/** The account side: records, GoTrue and lazy provisioning. */
@Injectable()
export class AccountKit {
  constructor(
    @Inject(SUBJECT_STORE) readonly subjects: SubjectStore,
    @Inject(AUTH_GATE) readonly auth: AuthGate,
    readonly provision: Provisioner,
  ) {}
}
