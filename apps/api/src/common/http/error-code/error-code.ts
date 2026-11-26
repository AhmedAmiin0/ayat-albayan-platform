import { HttpStatus } from '@nestjs/common';
import { z } from 'zod';

const CODE = /^[a-z][a-z0-9_]*$/;
const codedBody = z.looseObject({ code: z.string() });
const namedBody = z.looseObject({ message: z.string().regex(CODE) });
const objectBody = z.looseObject({});

const statusName = (status: number) => HttpStatus[status]?.toLowerCase() ?? 'http_error';

/** Nest answers a text body as `{ statusCode, message }`. */
function asObject(body: unknown, status: number): Record<string, unknown> {
  const parsed = objectBody.safeParse(body);
  return parsed.success ? parsed.data : { statusCode: status, message: body };
}

/**
 * The body with a `code` clients can switch on (docs/62 part 1 §3.2): its own, else its message
 * when that is a code, else its status name. `message` stays for builds that read it.
 */
export function withCode(body: unknown, status: number): Record<string, unknown> {
  const object = asObject(body, status);
  if (codedBody.safeParse(object).success) return object;
  const named = namedBody.safeParse(object);
  return { ...object, code: named.success ? named.data.message : statusName(status) };
}
