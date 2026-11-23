import { type ArgumentsHost, Catch, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { isDbTimeout } from './db-timeout';

/** How soon a client may try again after a database stall (seconds). */
const RETRY_AFTER_S = '5';

/**
 * A read that stalled changed nothing. A write may still commit after the client gave up, so the
 * client must resend it with the same clientRequestId (rule 8), never as a new request.
 */
const READ_METHODS: ReadonlySet<string> = new Set(['GET', 'HEAD']);
const codeFor = (method: string) => (READ_METHODS.has(method) ? 'db_timeout' : 'db_outcome_unknown');

/** The one reply method chain used (Fastify's reply). */
interface Reply {
  status(code: number): Reply;
  header(name: string, value: string): Reply;
  send(body: unknown): unknown;
}

/**
 * A request whose database call hit DB_TIMEOUT_MS answers 503 with Retry-After (db_timeout on a
 * read, db_outcome_unknown on a write), instead of a bare 500 after a long hang. Every other
 * error goes to Nest's own handling, unchanged.
 * Webhooks keep their own rule: any failed item answers 5xx, so the provider re-sends.
 */
@Catch()
export class DbTimeoutFilter extends BaseExceptionFilter {
  private readonly log = new Logger(DbTimeoutFilter.name);

  override catch(e: unknown, host: ArgumentsHost): void {
    if (!isDbTimeout(e)) {
      super.catch(e, host);
      return;
    }
    const http = host.switchToHttp();
    // The route pattern only (/students/:id), never an id or a phone from the path.
    const req = http.getRequest<{ method: string; routeOptions: { url: string } }>();
    const route = req.routeOptions.url;
    this.log.warn(`database call timed out on ${req.method} ${route}`);
    const code = codeFor(req.method);
    void http
      .getResponse<Reply>()
      .status(503)
      .header('Retry-After', RETRY_AFTER_S)
      .send({ code, message: code });
  }
}
