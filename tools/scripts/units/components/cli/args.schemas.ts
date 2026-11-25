import { z } from 'zod';

export const STEPS = ['types', 'hook'] as const;

/** `pnpm components` flags (docs/63 §4). */
export const componentArgs = z
  .object({
    dryRun: z.boolean(),
    write: z.boolean(),
    json: z.boolean(),
    step: z.enum([...STEPS, 'all']),
    paths: z.array(z.string().min(1)).min(1, '--paths <dir...> is required'),
    exclude: z.string().min(1).optional(),
    unknown: z.array(z.string()).max(0, 'unknown argument'),
  })
  .refine((a) => a.dryRun !== a.write, 'pass exactly one of --dry-run and --write');

export type ComponentArgs = z.infer<typeof componentArgs>;
export type Step = (typeof STEPS)[number];
