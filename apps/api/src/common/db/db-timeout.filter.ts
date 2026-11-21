import { type ArgumentsHost, Catch, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { isDbTimeout } from './db-timeout';

/** How soon a client may try again after a database stall (seconds). */
const RETRY_AFTER_S = '5';

/** The one reply method chain used (Fastify's reply). */
interface Reply {
  status(code: number): Reply;
  header(name: string, value: string): Reply;
  send(body: unknown): unknown;
}

/**
 * A request whose database call hit DB_TIMEOUT_MS answers 503 db_timeout with Retry-After, instead
 * of a bare 500 after a long hang. Every other error goes to Nest's own handling, unchanged.
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
    const route = http.getRequest<{ routeOptions?: { url?: string } }>().routeOptions?.url;
    this.log.warn(`database call timed out on ${route ?? 'a request'}`);
    void http
      .getResponse<Reply>()
      .status(503)
      .header('Retry-After', RETRY_AFTER_S)
      .send({ code: 'db_timeout', message: 'db_timeout' });
  }
}
