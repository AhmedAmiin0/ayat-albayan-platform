import { View } from 'react-native';
import { ErrorLine } from '@/inbox';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { confirmFailureText } from './confirm-lesson';
import { useSalesConfirm } from './lesson-actions-api';

interface SalesConfirmLessonProps {
  lessonId: string;
  /** The sheet then shows the lesson «مؤكدة» (the day query refetches behind it). */
  onConfirmed: () => void;
  /** In the row under a live «ادخل الحلقة»: outlined, so the sheet keeps one filled button. */
  secondary?: boolean;
}

/**
 * «تأكيد الحلقة» in sales' «تفاصيل الحلقة» (owner 2026-10-28): one tap, scheduled → confirmed, no message
 * to the family or the teacher. The sheet decides when it shows (canSalesConfirm (@ab/shared)).
 */
export function SalesConfirmLesson({ lessonId, onConfirmed, secondary = false }: SalesConfirmLessonProps) {
  const confirm = useSalesConfirm(lessonId);
  const a = t.sales.lessonActions;
  return (
    <View style={{ gap: 8 }}>
      {confirm.isError ? <ErrorLine message={confirmFailureText(confirm.error)} /> : null}
      <Button
        variant={secondary ? 'secondary' : 'primary'}
        label={confirm.isPending ? t.common.saving : a.confirm}
        busy={confirm.isPending}
        onPress={() => confirm.mutate(undefined, { onSuccess: onConfirmed })}
      />
    </View>
  );
}
