import { Body, Query, type PipeTransform } from '@nestjs/common';
import { z } from 'zod';
import { parseOrThrow, sentOnly } from './http';

// docs/36 Z-1: a Nest input is parsed by its zod schema before the handler runs (400 = the one
// `validation_failed` envelope). Built on @Body/@Query + a pipe, so Swagger and pipe order stay.

class ZodPipe<S extends z.ZodType> implements PipeTransform<unknown, z.output<S>> {
  constructor(private readonly schema: S) {}

  transform(value: unknown): z.output<S> {
    return parseOrThrow(this.schema, value);
  }
}

/** PATCH bodies: shared `*UpdateSchema` defaults would reset fields the client never sent. */
class SentOnlyPipe<S extends z.ZodType<object>> implements PipeTransform<
  unknown,
  Partial<z.output<S>>
> {
  constructor(private readonly schema: S) {}

  transform(value: unknown): Partial<z.output<S>> {
    return sentOnly(parseOrThrow(this.schema, value), value);
  }
}

export interface ZodBodyOptions {
  /** Keep only the keys the client sent (see `sentOnly`). */
  sentOnly?: boolean;
  /** A request with no JSON body (or `null`) is parsed as `{}` (was `body ?? {}`). */
  orEmpty?: boolean;
}

const emptyAsObject = (value: unknown): unknown => value ?? {};

/** `@ZodBody(schema) body: z.output<typeof schema>` replaces `@Body()` + parse. */
export function ZodBody(
  schema: z.ZodType<object>,
  options: ZodBodyOptions = {},
): ParameterDecorator {
  const parsed = options.orEmpty === true ? z.preprocess(emptyAsObject, schema) : schema;
  return Body(options.sentOnly === true ? new SentOnlyPipe(parsed) : new ZodPipe(parsed));
}

/** `@ZodQuery(schema) query: z.output<typeof schema>` replaces `@Query()` + parse. */
export function ZodQuery(schema: z.ZodType): ParameterDecorator {
  return Query(new ZodPipe(schema));
}
