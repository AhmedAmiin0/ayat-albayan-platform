import { InternalServerErrorException } from '@nestjs/common';
import type { z } from 'zod';

interface StoredAt {
  table: string;
  column: string;
}

/** A jsonb value that does not match its schema: a 500 that names the column, not silent data. */
export class StoredJsonError extends InternalServerErrorException {
  constructor(at: StoredAt, cause: z.ZodError) {
    super({ code: 'stored_json_invalid', message: 'stored_json_invalid', ...at }, { cause });
  }
}

export function parseStoredJson<S extends z.ZodType>(
  schema: S,
  value: unknown,
  at: StoredAt,
): z.output<S> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new StoredJsonError(at, parsed.error);
  return parsed.data;
}
