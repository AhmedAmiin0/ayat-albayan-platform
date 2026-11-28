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
const switchSchema = z.object({ API_CHECK_RESPONSES: z.literal('1').optional().catch(undefined) });

const replySchema = z.object({ statusCode: z.number() });

/** A 304 sends no body by HTTP's rule, so there is no answer to check. */
const notModified = (ctx: ExecutionContext): boolean =>
  replySchema.safeParse(ctx.switchToHttp().getResponse()).data?.statusCode === 304;

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
    if (notModified(ctx) || (await fits(schema, body))) return body;
    log.error(`response_contract on ${ctx.getClass().name}.${ctx.getHandler().name}`);
    throw new InternalServerErrorException({
      code: 'response_contract',
      message: 'response_contract',
    });
  }
}
