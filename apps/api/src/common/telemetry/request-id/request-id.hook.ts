import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { pickRequestId, REQUEST_ID_HEADER, withRequestId } from './request-id';

/** The FastifyAdapter options: each request's id from a sane X-Request-Id, else a new UUID. */
export const requestIdOptions = () => ({
  requestIdHeader: false as const,
  genReqId: (req: { headers: Record<string, unknown> }): string =>
    pickRequestId(req.headers[REQUEST_ID_HEADER]),
});

/**
 * First hook of every request (404s and closed paths too): the id goes back in X-Request-Id and
 * the rest of the request runs inside its context, so every log line of it carries the id.
 */
export function registerRequestId(app: NestFastifyApplication): void {
  app
    .getHttpAdapter()
    .getInstance()
    .addHook('onRequest', (req, reply, done) => {
      void reply.header(REQUEST_ID_HEADER, req.id);
      withRequestId(req.id, done);
    });
}
