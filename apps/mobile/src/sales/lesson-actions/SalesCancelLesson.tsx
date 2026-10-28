import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more';
import { Field } from '@/core/ui/form/Field';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { rescheduleFailure } from '@/teaching';
import { useSalesCancel } from './lesson-actions-api';

/**
 * Sales' «إلغاء الحلقة» (docs/16 row 37): this lesson only, the reason optional (none = stored null),
 * then «تأكيد الإلغاء». No «مين ألغى» and no series: the academy cancels it, as the admin's «الإدارة».
 */
export function SalesCancelLesson({ lessonId, onClose }: { lessonId: string; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const cancel = useSalesCancel(lessonId);
  const a = t.sales.lessonActions;
  if (cancel.isSuccess) return <Note>{a.cancelled}</Note>;
  const failure = cancel.isError ? rescheduleFailure(cancel.error) : null;
  return (
    <View style={{ gap: 10 }}>
      <Field label={a.reason} placeholder={a.reasonHint} value={reason} onChangeText={setReason} />
      {failure ? <ErrorLine message={failure.kind === 'error' ? failure.text : t.common.error} /> : null}
      <InlineConfirm
        tone="danger"
        message={a.cancelTitle}
        confirmLabel={cancel.isPending ? t.common.saving : a.confirmCancel}
        cancelLabel={t.common.back}
        onConfirm={() => (cancel.isPending ? undefined : cancel.mutate(reason.trim() ? { reason: reason.trim() } : {}))}
        onCancel={onClose}
      />
    </View>
  );
}
