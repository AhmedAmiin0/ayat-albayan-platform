import type { ErrorReporter, ReportTags } from '@ab/core';
import { jobBeats } from '@/common/jobs/beats';
import type { LoggedFailures } from '@/common/jobs/beats/beat-book.types';
import { currentRequestId } from './request-id';
import { RequestIdLogger } from './request-id.logger';

const STACK = /\n\s+at /;

/** Nest logs an unhandled error as (message, stack, context); a job as (message[, context]). */
function asError(message: unknown, stack: unknown): unknown {
  if (message instanceof Error) return message;
  const error = new Error(String(message));
  if (typeof stack === 'string' && STACK.test(stack)) error.stack = stack;
  return error;
}

/** Nest's logger passes its context last; none when the call had no extra argument. */
const contextOf = (rest: readonly unknown[]): string | undefined => {
  const last = rest.at(-1);
  return rest.length > 0 && typeof last === 'string' ? last : undefined;
};

function tagsOf(context: string | undefined): ReportTags {
  const id = currentRequestId();
  const tags: Record<string, string> = id === undefined ? {} : { request_id: id };
  if (context !== undefined) tags.context = context;
  return tags;
}

/**
 * RequestIdLogger whose error lines also fail the logging job's heartbeat (jobs catch their own
 * errors, so a pass that logged one is not a success) and go to the error tracker (SENTRY_DSN;
 * with no DSN nothing is sent).
 */
export class ReportingLogger extends RequestIdLogger {
  constructor(
    private readonly reporter: ErrorReporter,
    private readonly beats: LoggedFailures = jobBeats,
  ) {
    super();
  }

  override error(message: unknown, ...rest: unknown[]): void {
    super.error(message, ...rest);
    const context = contextOf(rest);
    if (context !== undefined) this.beats.failLogged(context, String(message));
    if (!this.reporter.enabled) return;
    this.reporter.capture(asError(message, rest[0]), tagsOf(context));
  }
}
