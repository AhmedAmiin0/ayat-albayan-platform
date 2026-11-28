import { z } from 'zod';

/** One key whose legacy effective value (readSettings over the rows) differs from ConfigStore's. */
export const configParityDiffSchema = z.object({
  key: z.string().min(1),
  legacy: z.unknown(),
  store: z.unknown(),
});
export type ConfigParityDiff = z.infer<typeof configParityDiffSchema>;

/** Empty `diffs` means both read paths agree (docs/26 §4 «Parity»). */
export const configParityResponseSchema = z.object({
  diffs: z.array(configParityDiffSchema),
  checkedKeys: z.int().nonnegative(),
});
export type ConfigParityResponse = z.infer<typeof configParityResponseSchema>;
