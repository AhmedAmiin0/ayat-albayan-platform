import { useLocalSearchParams } from 'expo-router';
import { z } from 'zod';
import { t } from '@ab/mobile-kit';
import { dateLine, rangeText } from '@/lessons';
import { FamilyHeader, FamilyPage } from '@/nav';
import { studentOf, useFamilyClock, usePortalMe } from '@/portal';
import { LoadState } from '@/ui';
import { LessonBody } from './LessonBody';
import { useLessonAssets } from './use-assets';

/** lesson/[id]?student= (rule 12: route params are parsed, never trusted). */
const paramsSchema = z.object({ id: z.string().min(1), student: z.string().min(1) });

/** Recording, report and staff files show only once the report was sent. */
export function LessonScreen() {
  const params = paramsSchema.parse(useLocalSearchParams());
  const input = { studentId: params.student, lessonId: params.id };
  const page = useLessonAssets(input);
  const student = studentOf(usePortalMe().data, params.student);
  const clock = { ...useFamilyClock(), tz: student?.tz ?? 'UTC' };
  const lesson = page.data;
  const title = lesson
    ? t.lessonFiles.lessonOf.replace('{when}', dateLine(new Date(lesson.lesson_starts_at), clock))
    : t.lessonFiles.lessonPage;
  const range = lesson
    && rangeText({ starts_at: lesson.lesson_starts_at, ends_at: lesson.lesson_ends_at }, clock);
  return (
    <FamilyPage
      header={
        <FamilyHeader
          title={title}
          subtitle={range && [student?.name, range].filter(Boolean).join(' · ')}
          back
        />
      }
      onRefresh={() => page.refetch()}
    >
      <LoadState query={page}>
        {(data) => <LessonBody view={data} studentId={params.student} />}
      </LoadState>
    </FamilyPage>
  );
}
