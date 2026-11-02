import type { PipeTransform, Type } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { z } from 'zod';

// Test-only: a handler's `@ZodBody` / `@ZodParam` pipe, so a test that calls the controller
// directly still proves the input is parsed (Nest runs the pipe; a direct call does not).

const pipeSchema = z.custom<PipeTransform>(
  (p) => z.looseObject({ transform: z.function() }).safeParse(p).success,
);
const routeArgsSchema = z.record(
  z.string(),
  z.looseObject({ data: z.unknown(), pipes: z.array(pipeSchema).default([]) }),
);
type RouteArg = z.output<typeof routeArgsSchema>[string];

const argsOf = <T>(controller: Type<T>, method: keyof T & string): [string, RouteArg][] =>
  Object.entries(
    routeArgsSchema.parse(Reflect.getMetadata(ROUTE_ARGS_METADATA, controller, method)),
  );

const runPipes =
  (pipes: PipeTransform[], type: 'body' | 'param') =>
  async (raw: unknown): Promise<unknown> => {
    let value = raw;
    for (const pipe of pipes) value = await pipe.transform(value, { type });
    return value;
  };

const isBody = (key: string): boolean => key.startsWith(`${RouteParamtypes.BODY}:`);

/** Runs the pipes of `controller.method`'s @Body parameter on a raw body. */
export function bodyPipeOf<T>(
  controller: Type<T>,
  method: keyof T & string,
): (raw: unknown) => Promise<unknown> {
  const pipes = argsOf(controller, method).find(([key]) => isBody(key))?.[1].pipes ?? [];
  return runPipes(pipes, 'body');
}

const isParam = (key: string): boolean => key.startsWith(`${RouteParamtypes.PARAM}:`);

/** Runs the pipes of `controller.method`'s `@Param(name)` on a raw path segment. */
export function paramPipeOf<T>(
  controller: Type<T>,
  at: { method: keyof T & string; name: string },
): (raw: unknown) => Promise<unknown> {
  const arg = argsOf(controller, at.method).find(([key, a]) => isParam(key) && a.data === at.name);
  return runPipes(arg?.[1].pipes ?? [], 'param');
}
