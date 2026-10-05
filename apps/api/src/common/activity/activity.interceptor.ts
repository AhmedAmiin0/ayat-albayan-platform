import {
  HttpException,
  Injectable,
  Logger,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { HTTP_CODE_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { tap, type Observable } from 'rxjs';
import { toEntry, type ActivityRequest } from './activity.entry';
import { actionKey, joinRoute, shouldLog } from './activity.route';
import { ActivityWriter } from './activity.writer';

function pathOf(meta: unknown): string {
  if (typeof meta === 'string') return meta;
  return Array.isArray(meta) && typeof meta[0] === 'string' ? meta[0] : '';
}

/** Status of a thrown error: its HTTP status, else 500 (what Nest answers). */
export function errorStatus(e: unknown): number {
  return e instanceof HttpException ? e.getStatus() : 500;
}

/**
 * Global activity log (owner, 2026-10-05): records every mutating request (POST/PUT/PATCH/DELETE)
 * once the handler has answered or thrown, with actor, role, route pattern, action key, entity,
 * status and duration. Recording is queued (ActivityWriter) and wrapped so it can never change
 * the response. Requests refused by the AuthGuard (401/403) never reach interceptors.
 */
@Injectable()
export class ActivityInterceptor implements NestInterceptor {
  private readonly log = new Logger(ActivityInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly writer: ActivityWriter,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (ctx.getType() !== 'http') return next.handle();
    const req = ctx.switchToHttp().getRequest<ActivityRequest>();
    const route = this.routeOf(ctx, req);
    if (!shouldLog({ method: req.method, route })) return next.handle();
    const started = Date.now();
    const action = actionKey(ctx.getClass().name, ctx.getHandler().name);
    const record = (status: number, response?: unknown) => {
      try {
        const row = toEntry({ req, route, action, status, durationMs: Date.now() - started, response });
        if (row) this.writer.push(row);
      } catch (e) {
        this.log.warn(`activity entry skipped: ${String(e)}`);
      }
    };
    return next.handle().pipe(
      tap({
        next: (body: unknown) => record(this.okStatus(ctx, req.method), body),
        error: (e: unknown) => record(errorStatus(e)),
      }),
    );
  }

  /** Fastify's matched pattern; else the Nest path metadata. Never the raw URL. */
  private routeOf(ctx: ExecutionContext, req: ActivityRequest): string {
    const url = req.routeOptions?.url;
    if (typeof url === 'string' && url !== '') return url;
    const base = pathOf(this.reflector.get<unknown>(PATH_METADATA, ctx.getClass()));
    return joinRoute(base, pathOf(this.reflector.get<unknown>(PATH_METADATA, ctx.getHandler())));
  }

  /** `@HttpCode()` is applied after interceptors, so read it from metadata (Nest's defaults else). */
  private okStatus(ctx: ExecutionContext, method: string): number {
    const code = this.reflector.get<number | undefined>(HTTP_CODE_METADATA, ctx.getHandler());
    return code ?? (method.toUpperCase() === 'POST' ? 201 : 200);
  }
}
