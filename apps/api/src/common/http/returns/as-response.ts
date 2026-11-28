import { InternalServerErrorException, Logger } from '@nestjs/common';
import type { z } from 'zod';

const log = new Logger('Response');

/**
 * The schema is the whitelist: z.object drops keys it does not name, at every depth. A row that
 * does not fit is a 500 that logs the failing paths, never the values (names, phones, money).
 * Read-route mappers only (docs/62 part 2 §2).
 */
export function asResponse<S extends z.ZodType>(schema: S, value: z.input<S>): z.output<S> {
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;
  log.error(`response_invalid at ${parsed.error.issues.map((i) => i.path.join('.')).join(', ')}`);
  throw new InternalServerErrorException({ code: 'response_invalid', message: 'response_invalid' });
}
