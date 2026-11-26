import { z } from 'zod';

/** `units:fold` flags, parsed from the raw argv (cli/args.ts). */
export const foldArgs = z
  .object({
    dryRun: z.boolean(),
    write: z.boolean(),
    skipOpenPrs: z.boolean(),
    components: z.boolean(),
    paths: z.array(z.string().min(1)),
    unknown: z.array(z.string()).max(0, 'unknown argument'),
  })
  .refine((a) => a.dryRun !== a.write, 'pass exactly one of --dry-run and --write')
  .refine((a) => !a.write || a.paths.length > 0, '--write needs --paths <dir...>');

export type FoldArgs = z.infer<typeof foldArgs>;
