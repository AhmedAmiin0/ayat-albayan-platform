import { createParamDecorator, type ExecutionContext, type PipeTransform } from '@nestjs/common';
import { z } from 'zod';
import { ZodParamPipe, ZodPipe } from '@/common/http/zod-inputs';
import { routeOf } from './route';
import type { ParamError, RawRouteInput, RouteInputOptions } from './route.types';

const requestSchema = z.object({ params: z.unknown(), query: z.unknown(), body: z.unknown() });

function readRequest(_data: unknown, ctx: ExecutionContext): RawRouteInput {
  const route = routeOf(ctx.getHandler());
  if (route === undefined) throw new Error('@RouteInput() needs @Route on the same handler');
  return { route, ...requestSchema.parse(ctx.switchToHttp().getRequest()) };
}

const rawInput = createParamDecorator(readRequest);

const parsed = (pipe: PipeTransform | undefined, value: unknown): unknown =>
  pipe?.transform(value, { type: 'custom' });

const paramValues = z.record(z.string(), z.unknown());

/**
 * A `:param` checked alone by its field schema, as @ZodParam did while the handler still read the
 * body itself: a bad param then wins over a bad body, and its issue sits on the param ('').
 */
const eachParamFirst = async ({ route, params }: RawRouteInput, options: RouteInputOptions) => {
  const values = paramValues.parse(params);
  const shape = route.params instanceof z.ZodObject ? route.params.shape : {};
  const extra = options.paramChecks ?? {};
  const checks = Object.entries(shape).map(([name, field]) => {
    const check = z.unknown().pipe(field).pipe(extra[name] ?? z.unknown());
    return new ZodParamPipe(check, options.badParam).transform(values[name]);
  });
  await Promise.all(checks);
};

const fieldsOf = ({ params }: RawRouteInput['route']) =>
  new Map(Object.entries(params instanceof z.ZodObject ? params.shape : {}));

const eachNamedParam = async ({ route, params }: RawRouteInput, named: readonly ParamError[]) => {
  const values = paramValues.parse(params);
  const fields = fieldsOf(route);
  const checks = named.map(({ name, fail }) =>
    new ZodParamPipe(z.unknown().pipe(fields.get(name) ?? z.never()), fail).transform(values[name]),
  );
  await Promise.all(checks);
};

const ORDER = { bodyFirst: () => Promise.resolve(), paramsFirst: eachParamFirst };

/**
 * Body and query parse through ZodPipe, params through ZodParamPipe, in that order, so a bad body
 * still wins over a bad param as with @ZodBody and @ZodParam, unless `paramsFirst` is set.
 */
class RouteInputPipe implements PipeTransform<RawRouteInput, Promise<object>> {
  constructor(private readonly options: RouteInputOptions) {}

  async transform(raw: RawRouteInput): Promise<object> {
    const { route } = raw;
    const { badParam, paramsFirst } = this.options;
    await ORDER[paramsFirst === true ? 'paramsFirst' : 'bodyFirst'](raw, this.options);
    const body = await parsed(route.body && new ZodPipe(route.body), raw.body);
    const query = await parsed(route.query && new ZodPipe(route.query), raw.query);
    await eachNamedParam(raw, this.options.paramErrors ?? []);
    const paramPipe = route.params && new ZodParamPipe(route.params, badParam);
    const params = await parsed(paramPipe, raw.params);
    return { params, query, body };
  }
}

/** `@RouteInput() input: RouteInputOf<typeof xRoutes.get>`: the route's params, query and body. */
export function RouteInput(options: RouteInputOptions = {}): ParameterDecorator {
  return rawInput(undefined, new RouteInputPipe(options));
}
