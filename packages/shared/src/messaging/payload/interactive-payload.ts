import { z } from 'zod';
import { parseOrNull } from './lenient.js';

// messages.interactive_payload as the webhook keeps it, and Meta's message objects: an object
// with its `type` ({ type, [type]: …, errors? }). Each reader parses the part it needs.

export const interactivePayloadSchema = z.looseObject({ type: z.string() });
export type InteractivePayload = z.infer<typeof interactivePayloadSchema>;

/** The payload's type; null when it is not an object with a string type. */
export const payloadTypeOf = (payload: unknown): string | null =>
  parseOrNull(interactivePayloadSchema, payload)?.type ?? null;

/** A payload of exactly this type. */
export function payloadOfType<T extends string>(
  type: T,
): z.ZodObject<{ type: z.ZodLiteral<T> }, z.core.$loose> {
  return z.looseObject({ type: z.literal(type) });
}

/** Whether the payload is of this type. */
export const isPayloadOfType = (payload: unknown, type: string): boolean =>
  payloadOfType(type).safeParse(payload).success;
