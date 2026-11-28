import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { type PgErrorMap, UNIQUE_VIOLATION } from '@/common/db/errors';

// The people modules' database error map, shared by the guardians and students modules.
// ponytail: lives here until a second feature needs it; then move to common/.

const badRequest = (e: PostgrestError) => new BadRequestException(e.message);
const notFound = () => new NotFoundException();

/** The people modules' codes on top of the default map: a conflict names its code. */
export function peopleErrors(conflict = 'conflict'): PgErrorMap {
  const taken = () => new ConflictException(conflict);
  return {
    codes: {
      [UNIQUE_VIOLATION]: taken,
      '23503': taken,
      P0002: notFound,
      PGRST116: notFound,
      '22023': badRequest,
      '23514': badRequest,
    },
  };
}
