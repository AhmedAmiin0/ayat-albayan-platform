import { useLocalSearchParams } from 'expo-router';
import { z } from 'zod';
import { studentOf, useFamilyClock, usePortalMe } from '@/portal';
import { useLessonAssets } from '@/recordings/use-assets';
import { lessonHeading } from './lesson-screen.helpers';

/** lesson/[id]?student= (rule 12: route params are parsed, never trusted). */
const paramsSchema = z.object({ id: z.string().min(1), student: z.string().min(1) });

export function useLessonScreen() {
  const params = paramsSchema.parse(useLocalSearchParams());
  const input = { studentId: params.student, lessonId: params.id };
  const page = useLessonAssets(input);
  const student = studentOf(usePortalMe().data, params.student);
  const clock = { ...useFamilyClock(), tz: student?.tz ?? 'UTC' };
  const heading = lessonHeading({ lesson: page.data, name: student?.name, clock });
  return { params, page, ...heading };
}
