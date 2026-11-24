import { useLocalSearchParams } from 'expo-router';
import { z } from 'zod';
import {
  BackButton, ErrorState, locale, Screen, ScreenHeader, SkeletonCard, t,
} from '@ab/mobile-kit';
import { useViewerClock } from '@/core/lib/clock';
import { backWithin } from '@/core/nav/back-within';
import { useLessonAssets } from './api';
import { lessonHeadline } from './file-words';
import { LessonFilesBody } from './LessonFilesBody';

const paramsSchema = z.object({ id: z.string().min(1) });

/** The API keeps a teacher to their own lessons. */
export function LessonFilesScreen({ admin = true }: { admin?: boolean }) {
  const { id } = paramsSchema.parse(useLocalSearchParams());
  const query = useLessonAssets(id);
  const clock = { ...useViewerClock(), locale };
  const headline = query.data && lessonHeadline(query.data, clock);
  const back = () => backWithin(admin ? '/students' : '/teacher/reports');
  return (
    <Screen scroll>
      <ScreenHeader
        title={t.lessonFiles.title}
        subtitle={headline}
        leading={<BackButton onPress={back} />}
      />
      {query.data ? <LessonFilesBody data={query.data} /> : null}
      {!query.data && query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} message={t.lessonFiles.loadFailed} />
      ) : null}
      {!query.data && !query.isError ? <SkeletonCard /> : null}
    </Screen>
  );
}

/** The teacher's view: back to their reports. */
export function TeacherLessonFilesScreen() {
  return <LessonFilesScreen admin={false} />;
}
