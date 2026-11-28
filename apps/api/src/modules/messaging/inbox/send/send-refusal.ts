import { z } from 'zod';

const refusalSchema = z.object({ code: z.string() });

/** A send pick that names why nothing can go (`{ code }`) rather than where it leaves from. */
export const refused = <T extends object>(pick: T): pick is Extract<T, { code: unknown }> =>
  refusalSchema.safeParse(pick).success;
