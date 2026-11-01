import { errorFor, type ErrorTable } from './errors';
import { Failed, mayHaveReached, Passthrough, type HttpFailure } from './failure';

// One call's deadline: it aborts the request's signal AND races the transport, so a fetch that
// ignores its signal still ends on time (today's guarantee in kapso-reopener.ts).

export interface Phase {
  /** Set when the transport is called: a failure before that (headers(), the URL) never left. */
  sent: boolean;
  /** Set once the response headers arrived: a failure after that has reached the peer. */
  headers: boolean;
}

interface Run<E extends Error> {
  ms: number;
  caller?: AbortSignal;
  errors: ErrorTable<E>;
  where: string;
}

interface Ctx<E extends Error> {
  error: unknown;
  run: Run<E>;
  deadline: AbortSignal;
  phase: Phase;
}

const tableError = <E extends Error>(ctx: Ctx<E>, failure: HttpFailure): E =>
  errorFor(ctx.run.errors, failure);

/** A rule's answer: what to throw, or undefined when the rule does not apply. */
type Rule = (ctx: Ctx<Error>) => { thrown: unknown } | undefined;

const callerAbort: Rule = (c) =>
  c.run.caller?.aborted ? { thrown: c.run.caller.reason } : undefined;
const callersOwn: Rule = (c) =>
  c.error instanceof Passthrough ? { thrown: c.error.error } : undefined;
const timedOut: Rule = (c) =>
  c.deadline.aborted
    ? { thrown: tableError(c, { kind: 'timeout', where: c.run.where }) }
    : undefined;
const classified: Rule = (c) =>
  c.error instanceof Failed ? { thrown: tableError(c, c.error.failure) } : undefined;

/** First match wins: the caller's abort, its own error, the deadline, a classified failure. */
const RULES: readonly Rule[] = [callerAbort, callersOwn, timedOut, classified];

function network<E extends Error>(ctx: Ctx<E>): E {
  const reached = ctx.phase.headers || (ctx.phase.sent && mayHaveReached(ctx.error));
  return tableError(ctx, { kind: 'network', reached, where: ctx.run.where });
}

function settle<E extends Error>(ctx: Ctx<E>): unknown {
  for (const rule of RULES) {
    const hit = rule(ctx);
    if (hit) return hit.thrown;
  }
  return network(ctx);
}

const noop = (): void => undefined;

/** `work` within `run.ms`; every way it can fail ends as the table's error (or the caller's). */
export async function withDeadline<T, E extends Error>(
  run: Run<E>,
  work: (signal: AbortSignal, phase: Phase) => Promise<T>,
): Promise<T> {
  run.caller?.throwIfAborted();
  const deadline = new AbortController();
  const signal = run.caller ? AbortSignal.any([run.caller, deadline.signal]) : deadline.signal;
  const phase: Phase = { sent: false, headers: false };
  const ended = new AbortController();
  const timer = setTimeout(() => {
    deadline.abort(new Error(`${run.where} timed out`));
  }, run.ms);
  const stopped = new Promise<never>((_, reject) => {
    const stop = (): void => {
      reject(new Error(`${run.where} stopped`));
    };
    signal.addEventListener('abort', stop, { signal: ended.signal });
  });
  stopped.catch(noop);
  const running = work(signal, phase);
  running.catch(noop);
  try {
    return await Promise.race([running, stopped]);
  } catch (error) {
    throw settle({ error, run, deadline: deadline.signal, phase });
  } finally {
    clearTimeout(timer);
    ended.abort();
  }
}
