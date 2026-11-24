import { router, useLocalSearchParams } from 'expo-router';
import { t, BackButton, EmptyState, Screen, ScreenHeader } from '@ab/mobile-kit';
import { sourceFromParams } from './makeup-draft';
import { MakeupWizard } from './MakeupWizard';

/** Admin tabs only (root stack gates it); missing lesson facts show not-found, not a guess. */
export function MakeupScreen() {
  const params = useLocalSearchParams();
  const source = sourceFromParams(params);
  return (
    <Screen>
      {source ? (
        <MakeupWizard key={source.lessonId + source.studentId} source={source} />
      ) : (
        <>
          <ScreenHeader
            title={t.booking.makeup.title}
            leading={<BackButton onPress={() => router.back()} />}
          />
          <EmptyState title={t.common.notFound} />
        </>
      )}
    </Screen>
  );
}
