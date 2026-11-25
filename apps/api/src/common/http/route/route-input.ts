import { createParamDecorator, type ExecutionContext, type PipeTransform } from '@nestjs/common';
import { z } from 'zod';
import { ZodParamPipe, ZodPipe, type ParamFailure } from '@/common/http/zod-inputs';
import { routeOf } from './route';
import type { RawRouteInput, RouteInputOptions } from './route.types';

const requestSchema = z.object({ params: z.unknown(), query: z.unknown(), body: z.unknown() });

function readRequest(_data: unknown, ctx: ExecutionContext): RawRouteInput {
  const route = routeOf(ctx.getHandler());
  if (route === undefined) throw new Error('@RouteInput() needs @Route on the same handler');
  return { route, ...requestSchema.parse(ctx.switchToHttp().getRequest()) };
}

const rawInput = createParamDecorator(readRequest);

const parsed = (pipe: PipeTransform | undefined, value: unknown): unknown =>
  pipe?.transform(value, { type: 'custom' });

/**
 * Body and query parse through ZodPipe, params through ZodParamPipe, in that order, so a bad body
 * still wins over a bad param as with @ZodBody and @ZodParam.
 */
class RouteInputPipe implements PipeTransform<RawRouteInput, Promise<object>> {
  constructor(private readonly badParam?: ParamFailure) {}

  async transform(raw: RawRouteInput): Promise<object> {
    const { route } = raw;
    const body = await parsed(route.body && new ZodPipe(route.body), raw.body);
    const query = await parsed(route.query && new ZodPipe(route.query), raw.query);
    const paramPipe = route.params && new ZodParamPipe(route.params, this.badParam);
    const params = await parsed(paramPipe, raw.params);
    return { params, query, body };
  }
}

/** `@RouteInput() input: RouteInputOf<typeof xRoutes.get>`: the route's params, query and body. */
export function RouteInput(options: RouteInputOptions = {}): ParameterDecorator {
  return rawInput(undefined, new RouteInputPipe(options.badParam));
}
