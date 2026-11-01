import type { PipeTransform, Type } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { z } from 'zod';

// Test-only: a handler's `@ZodBody` pipe, so a test that calls the controller directly still
// proves the body is parsed (Nest runs the pipe; a direct call does not).

const pipeSchema = z.custom<PipeTransform>(
  (p) => z.looseObject({ transform: z.function() }).safeParse(p).success,
);
const routeArgsSchema = z.record(
  z.string(),
  z.looseObject({ pipes: z.array(pipeSchema).default([]) }),
);

const isBody = (key: string): boolean => key.startsWith(`${RouteParamtypes.BODY}:`);

/** Runs the pipes of `controller.method`'s @Body parameter on a raw body. */
export function bodyPipeOf<T>(
  controller: Type<T>,
  method: keyof T & string,
): (raw: unknown) => Promise<unknown> {
  const args = routeArgsSchema.parse(Reflect.getMetadata(ROUTE_ARGS_METADATA, controller, method));
  const pipes = Object.entries(args).find(([key]) => isBody(key))?.[1].pipes ?? [];
  return async (raw) => {
    let value = raw;
    for (const pipe of pipes) value = await pipe.transform(value, { type: 'body' });
    return value;
  };
}
