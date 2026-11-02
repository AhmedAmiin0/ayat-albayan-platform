import { Param, type PipeTransform } from '@nestjs/common';
import { z } from 'zod';
import { parseOrThrow } from './http';

// docs/36 z2b: a `:id`-style route param is a GUID, parsed by zod (was Nest's ParseUUIDPipe).
// `z.guid()` accepts what ParseUUIDPipe's loose 8-4-4-4-12 hex check accepted (no RFC nibbles).
// The 400 body is the one `validation_failed` envelope, the issue path being the param's name.

/** The issue message of a bad id (was «Validation failed (uuid is expected)»). */
const INVALID_UUID = 'invalid_uuid';

/** `{ [name]: guid }` → the id; a bad one is the issue `{ path: name, message: invalid_uuid }`. */
const guidField = (name: string): z.ZodType<string> =>
  z.object({ [name]: z.guid({ error: INVALID_UUID }) }).transform((o) => String(o[name]));

/** One named id parsed outside a decorator (params read as one object, e.g. `messageParams`). */
export function uuidOf(name: string, value: unknown): string {
  return parseOrThrow(guidField(name), { [name]: value });
}

/**
 * Synchronous (ZodBody / ZodParam wait for turns): as with ParseUUIDPipe, a bad id fails before a
 * bad body or a bad `:phone`, and the LAST uuid param of a handler fails first.
 */
class UuidPipe implements PipeTransform<unknown, string> {
  constructor(private readonly name: string) {}

  transform(value: unknown): string {
    return uuidOf(this.name, value);
  }
}

/** `@UuidParam('id') id: string` replaces `@Param('id', ParseUUIDPipe) id: string`. */
export function UuidParam(name: string): ParameterDecorator {
  return Param(name, new UuidPipe(name));
}
