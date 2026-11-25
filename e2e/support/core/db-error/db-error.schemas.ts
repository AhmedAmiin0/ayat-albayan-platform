import { z } from 'zod';

export const dbErrorSchema = z.object({
  code: z.string().optional(),
  message: z.string().optional(),
  detail: z.string().optional(),
  constraint_name: z.string().optional(),
});
