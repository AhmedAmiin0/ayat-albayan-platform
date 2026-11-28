import type { z } from 'zod';
import type { ReturnsDecorator } from './returns.types';

const SCHEMAS = new Map<unknown, z.ZodType>();

/** The response schema a handler declared with @Returns. */
export function returnsOf(handler: unknown): z.ZodType | undefined {
  return SCHEMAS.get(handler);
}

/** Records a handler's JSON answer; a route object's 'empty', 'file' or 'redirect' records none. */
export function declareReturns(handler: unknown, answer: z.ZodType | string): void {
  SCHEMAS.delete(handler);
  if (typeof answer !== 'string') SCHEMAS.set(handler, answer);
}

/** Declares a handler's JSON answer (docs/62 part 1 §1); the response check reads it in tests. */
export function Returns<S extends z.ZodType>(schema: S): ReturnsDecorator<z.input<S>> {
  return (_target, _key, descriptor) => declareReturns(descriptor.value, schema);
}
