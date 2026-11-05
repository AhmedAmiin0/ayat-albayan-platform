import { z } from 'zod';
import { CORRECT_TO } from '../lessons/index.js';

/**
 * POST /lessons/:id/correct (lessons.write) and /sales/lessons/:id/correct (lessons.cancel), owner
 * 2026-11-03: what happened to an ended lesson, or to one the job settled. The API decides whether
 * it may still be corrected (409 not_auto_held / earning_paid).
 */
export const lessonCorrectSchema = z.strictObject({ to: z.enum(CORRECT_TO) });
export type LessonCorrect = z.infer<typeof lessonCorrectSchema>;
