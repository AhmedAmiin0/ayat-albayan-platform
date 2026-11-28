import {
  type CallHandler,
  type ExecutionContext,
  InternalServerErrorException,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import { isDeepStrictEqual } from 'node:util';
import { mergeMap, type Observable } from 'rxjs';
import { z } from 'zod';
import { returnsOf } from './returns';

const log = new Logger('ResponseCheck');
const NOT_MODIFIED = 304;

const replySchema = z.looseObject({ statusCode: z.number().catch(0) }).catch({ statusCode: 0 });

/** A 304 carries no body (RFC 9110 §15.4.5), so it has no answer to compare. */
const isNotModified = (ctx: ExecutionContext): boolean =>
  replySchema.parse(ctx.switchToHttp().getResponse()).statusCode === NOT_MODIFIED;

const switchSchema = z.object({ API_CHECK_RESPONSES: z.literal('1').optional().catch(undefined) });

/** The body as the client reads it: JSON text read back (dates as text, undefined keys gone). */
const wireOf = async (body: unknown): Promise<unknown> =>
  z.unknown().parse(await new Response(JSON.stringify(body ?? null)).json());

/** True when the schema reads the wire back unchanged: no missing, extra or mistyped field. */
async function fits(schema: z.ZodType, body: unknown): Promise<boolean> {
  const wire = await wireOf(body);
  const parsed = schema.safeParse(wire);
  return parsed.success && isDeepStrictEqual(parsed.data, wire);
}

/**
 * Tests and e2e only (API_CHECK_RESPONSES=1): a handler's answer must match its @Returns schema
 * exactly, else 500 `response_contract`. It never replaces the body; production parses nothing.
 */
export class ResponseCheckInterceptor implements NestInterceptor {
  constructor(readonly on: boolean) {}

  static fromEnv(env: NodeJS.ProcessEnv = process.env): ResponseCheckInterceptor {
    return new ResponseCheckInterceptor(switchSchema.parse(env).API_CHECK_RESPONSES === '1');
  }

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const schema = this.on ? returnsOf(ctx.getHandler()) : undefined;
    const answer = next.handle();
    return schema ? answer.pipe(mergeMap((body) => this.checked(schema, body, ctx))) : answer;
  }

  private async checked(schema: z.ZodType, body: unknown, ctx: ExecutionContext): Promise<unknown> {
    if (isNotModified(ctx) || (await fits(schema, body))) return body;
    log.error(`response_contract on ${ctx.getClass().name}.${ctx.getHandler().name}`);
    throw new InternalServerErrorException({
      code: 'response_contract',
      message: 'response_contract',
    });
  }
}
