import { z } from 'zod';

/** The link's signed token: at most 100 characters, Fastify's maxParamLength. */
export const teacherLinkReportParamsSchema = z.object({
  token: z.string().min(1).max(100),
  id: z.uuid(),
});
