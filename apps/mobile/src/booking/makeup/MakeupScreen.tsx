import { router, useLocalSearchParams } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { BackButton } from '@/core/ui/navigation';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { sourceFromParams } from './makeup-draft';
import { MakeupWizard } from './MakeupWizard';

/**
 * /students/makeup/:lessonId?studentId&studentName&tz&missedAt&durationMin&teacherId&teacherName,
 * opened from a missed lesson's row in «الجدول» (admin tabs only: the route sits under (tabs), which
 * the root stack gates). A link without the lesson's facts says «مش لاقيين» instead of guessing.
 */
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
