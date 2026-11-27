import { z } from 'zod';

/** GET /sales/booking/course?studentId (the assistant's course wizard). */
export const courseQuerySchema = z.object({ studentId: z.uuid() });
