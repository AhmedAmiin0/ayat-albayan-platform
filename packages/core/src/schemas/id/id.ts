import { z } from 'zod';

/** A row id: the loose hex shape Nest's ParseUUIDPipe accepted, any version nibble. */
export const id = (): z.ZodGUID => z.guid();

/** The retry key of a write (rule 8): a repeat with the same key answers the first result. */
export const clientRequestId = z.uuid();
