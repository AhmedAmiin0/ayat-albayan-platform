import { z } from 'zod';

/** `pnpm api:one` flags (docs/62 part 3 §3b). */
export const apiOneArgs = z.object({
  write: z.boolean(),
  exclude: z.string().min(1).optional(),
  unknown: z.array(z.string()).max(0, 'unknown argument'),
});

export type ApiOneArgs = z.infer<typeof apiOneArgs>;
