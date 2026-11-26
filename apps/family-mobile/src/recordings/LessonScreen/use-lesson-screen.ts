import { useLocalSearchParams } from 'expo-router';
import { z } from 'zod';
import { t } from '@ab/mobile-kit';
import { dateLine, rangeText } from '@/lessons';
import { studentOf, useFamilyClock, usePortalMe } from '@/portal';
import { useLessonAssets } from '@/recordings/use-assets';

/** lesson/[id]?student= (rule 12: route params are parsed, never trusted). */
const paramsSchema = z.object({ id: z.string().min(1), student: z.string().min(1) });
export function useLessonScreen() {
  const params = paramsSchema.parse(useLocalSearchParams());
  const input = { studentId: params.student, lessonId: params.id };
  const page = useLessonAssets(input);
  const student = studentOf(usePortalMe().data, params.student);
  const clock = { ...useFamilyClock(), tz: student?.tz ?? 'UTC' };
  const lesson = page.data;
  const title = lesson
    ? t.lessonFiles.lessonOf.replace('{when}', dateLine(new Date(lesson.lesson_starts_at), clock))
    : t.lessonFiles.lessonPage;
  const range =
    lesson &&
    rangeText({ starts_at: lesson.lesson_starts_at, ends_at: lesson.lesson_ends_at }, clock);
  return { params, page, student, title, range };
}
