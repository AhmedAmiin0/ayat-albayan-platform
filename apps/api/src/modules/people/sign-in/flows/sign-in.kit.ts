import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import { CodeIssuer, type CodeTarget } from '@/modules/people/sign-in/codes/code-issuer';
import { SignInLimits } from '@/modules/people/sign-in/codes/code-limits';

export const invalidCode = () =>
  new UnauthorizedException({ code: 'invalid_code', message: 'invalid_code' });
export const invalidCredentials = () =>
  new UnauthorizedException({ code: 'invalid_credentials', message: 'invalid_credentials' });
export const codesUnavailable = () =>
  new HttpException(
    { code: 'codes_unavailable', message: 'codes_unavailable' },
    HttpStatus.SERVICE_UNAVAILABLE,
  );

/** One sign-in / password event in audit_log (entity `auth`): never a code, hash or password. */
export interface AuthEvent {
  userId: string;
  action: 'code_sign_in' | 'password_set' | 'password_reset';
  via: string;
}

type LimitStep = Parameters<SignInLimits['assert']>[0];
type CodeCheck = Parameters<CodeIssuer['check']>[0];

/**
 * The codes, the limits and the audit trail of the sign-in flows, plus the after-response runner:
 * lookups and the WhatsApp send of a 202 route run after the answer, so neither the answer nor its
 * timing tells whether the account exists.
 */
@Injectable()
export class SignInKit {
  private readonly log = new Logger(SignInKit.name);
  private readonly running = new Set<Promise<void>>();

  constructor(
    private readonly codes: CodeIssuer,
    private readonly limits: SignInLimits,
    private readonly audit: AuditService,
  ) {}

  /** 429 too_many_requests when either bucket of this step is full. */
  guard(step: LimitStep, at: { ip: string; identifier: string }): Promise<void> {
    return this.limits.assert(step, at);
  }

  /** Codes can go out now (flag, pepper, approved template, open send gate). */
  available(): Promise<boolean> {
    return this.codes.available();
  }

  check(input: CodeCheck): Promise<boolean> {
    return this.codes.check(input);
  }

  /** Issue a code (CodeIssuer takes the phone's shared send buckets once it would send). */
  issue(target: CodeTarget): Promise<boolean> {
    return this.codes.issue(target);
  }

  later(task: () => Promise<unknown>): void {
    const run: Promise<void> = task()
      .then(() => undefined)
      .catch((e: unknown) => this.log.error(`sign-in background task: ${messageOf(e)}`))
      .finally(() => this.running.delete(run));
    this.running.add(run);
  }

  /** Resolves once every task started so far is done (tests, shutdown). */
  async idle(): Promise<void> {
    await Promise.all([...this.running]);
  }

  record(event: AuthEvent): Promise<void> {
    const { userId, action, via } = event;
    return this.audit.record({
      actorId: userId,
      entity: 'auth',
      entityId: userId,
      action,
      after: { via },
    });
  }
}

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));
