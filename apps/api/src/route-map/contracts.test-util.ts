import type { RouteSpec } from '@ab/core';
import type { PipeTransform } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { z } from 'zod';
import { routeOf } from '@/common/http/route';
import { declaredSchema } from '@/common/http/zod-inputs';
import { appControllers, handlersOf } from './route-map.test-util';
import type { RouteContract, RouteHandler } from './route-map.types';

const partSchema = z.enum(['params', 'query', 'body']);
type Part = z.infer<typeof partSchema>;

const pipeSchema = z.custom<PipeTransform>(
  (p) => z.looseObject({ transform: z.function() }).safeParse(p).success,
);
const argsSchema = z
  .record(z.string(), z.object({ data: z.unknown(), pipes: z.array(z.unknown()).default([]) }))
  .default({});
const PARTS = z.record(z.string(), partSchema).readonly().decode({
  [RouteParamtypes.BODY]: 'body',
  [RouteParamtypes.QUERY]: 'query',
  [RouteParamtypes.PARAM]: 'params',
});

/** Pipe classes (ParseUUIDPipe) and other pipes declare no schema. */
function schemaOfPipe(pipe: unknown): z.ZodType | undefined {
  const instance = pipeSchema.safeParse(pipe);
  return instance.success ? declaredSchema(instance.data) : undefined;
}

const json = (schema: z.ZodType): unknown =>
  z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' });

interface Declared {
  part: Part;
  name: unknown;
  schema: z.ZodType;
}

function declaredOf({ cls, name }: RouteHandler): Declared[] {
  const args = argsSchema.parse(Reflect.getMetadata(ROUTE_ARGS_METADATA, cls, name));
  return Object.entries(args).flatMap(([key, arg]) => {
    const part = PARTS[key.split(':')[0] ?? ''];
    const schema = arg.pipes.map(schemaOfPipe).find((s) => s !== undefined);
    return part && schema ? [{ part, name: arg.data, schema }] : [];
  });
}

/** A `@ZodParam(name)` joins the others into one params object, as a route object declares it. */
function paramsOf(declared: Declared[]): z.ZodType | undefined {
  const params = declared.filter((d) => d.part === 'params');
  const whole = params.find((d) => typeof d.name !== 'string');
  const named = params.flatMap((d) => (typeof d.name === 'string' ? [[d.name, d.schema]] : []));
  return whole?.schema ?? (named.length > 0 ? z.object(Object.fromEntries(named)) : undefined);
}

function jsonParts(parts: Partial<Record<Part, z.ZodType>>): RouteContract {
  const entries = Object.entries<z.ZodType | undefined>(parts).flatMap(
    ([key, schema]): [string, unknown][] => (schema ? [[key, json(schema)]] : []),
  );
  return Object.fromEntries(entries);
}

function fromPipes(handler: RouteHandler): RouteContract {
  const declared = declaredOf(handler);
  const one = (part: Part) => declared.find((d) => d.part === part)?.schema;
  return jsonParts({ params: paramsOf(declared), query: one('query'), body: one('body') });
}

function fromRoute(route: RouteSpec): RouteContract {
  const { params, query, body, response } = route;
  const answer = typeof response === 'string' ? response : json(response);
  return { ...jsonParts({ params, query, body }), response: answer };
}

const contractOf = (handler: RouteHandler): RouteContract => {
  const route = routeOf(handler.handler);
  return route ? fromRoute(route) : fromPipes(handler);
};

/**
 * Every route's declared schemas as JSON Schema (input side), keyed `METHOD path` and sorted. A
 * route that declares nothing is left out. Shape only: refinements and preprocess bodies are not
 * visible here; the golden payload tests pin those.
 */
export async function contractMap(): Promise<Record<string, RouteContract>> {
  const handlers = (await appControllers()).flatMap(handlersOf);
  const entries = handlers
    .map((h): [string, RouteContract] => [`${h.method} ${h.path}`, contractOf(h)])
    .filter(([, contract]) => Object.keys(contract).length > 0)
    .sort(([a], [b]) => a.localeCompare(b));
  return Object.fromEntries(entries);
}
