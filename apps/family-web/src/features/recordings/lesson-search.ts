import { z } from 'zod';

/** `/lesson/<id>?studentId=…` and `/recordings/<id>`: whose lesson (a bad value reads as none). */
const lessonSearch = z.object({ studentId: z.string().catch('') }).catch({ studentId: '' });

type LessonSearch = z.infer<typeof lessonSearch>;

export const parseLessonSearch = (search: Record<string, unknown>): LessonSearch =>
  lessonSearch.parse(search);
