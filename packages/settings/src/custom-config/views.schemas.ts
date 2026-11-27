import { id, instant, type Json } from '@ab/core';
import { z } from 'zod';

/** Typed as the rows' `Json`, so a stored value passes without a copy. */
const storedJson: z.ZodType<Json> = z.json();

/** One custom entry as the admin API returns it (GET /config/custom). */
export const customConfigViewSchema = z.object({
  key: z.string(),
  value: storedJson,
  description: z.string().nullable(),
  isPublic: z.boolean(),
  updatedAt: instant,
  updatedBy: id().nullable(),
});
export type CustomConfigView = z.infer<typeof customConfigViewSchema>;
