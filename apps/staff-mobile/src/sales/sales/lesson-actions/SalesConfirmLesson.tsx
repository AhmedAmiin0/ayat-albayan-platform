import { View } from 'react-native';
import { t, Button, ErrorLine } from '@ab/mobile-kit';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { confirmFailureText } from './confirm-lesson';
import { useSalesConfirm } from './lesson-actions-api';

interface SalesConfirmLessonProps {
  lessonId: string;
  /** The sheet then shows the lesson as confirmed while the day query refetches. */
  onConfirmed: () => void;
  /** Outlined under a live join button, so the sheet keeps one filled button. */
  secondary?: boolean;
}

/** One tap from scheduled to confirmed, with no message to the family or the teacher. */
export function SalesConfirmLesson({
  lessonId,
  onConfirmed,
  secondary = false,
}: SalesConfirmLessonProps) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const confirm = useSalesConfirm(lessonId);
  const a = t.sales.lessonActions;
  return (
    <View style={{ gap: 8 }}>
      {confirm.isError ? (
        <ErrorLine message={confirmFailureText(confirm.error, cycle, tz)} />
      ) : null}
      <Button
        variant={secondary ? 'secondary' : 'primary'}
        label={confirm.isPending ? t.common.saving : a.confirm}
        busy={confirm.isPending}
        onPress={() => confirm.mutate(undefined, { onSuccess: onConfirmed })}
      />
    </View>
  );
}
