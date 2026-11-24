import { useState } from 'react';
import { View } from 'react-native';
import type { SalesCancel } from '@ab/shared';
import { t, Field, FilterPills, ErrorLine } from '@ab/mobile-kit';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { Note } from '@/more';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { SectionLabel } from '@/core/ui/surface/SectionLabel';
import { rescheduleFailure } from '@/teaching';
import { CANCEL_BY_LABEL, type SalesCancelBy } from './cancel-by';
import { useSalesCancel } from './lesson-actions-api';

interface SalesCancelLessonProps {
  lessonId: string;
  /** Who may be recorded, the default first; one choice hides the picker. */
  choices: readonly SalesCancelBy[];
  onClose: () => void;
}

/** The body: the reason when typed; `by` only when she had a choice (one: the academy). */
function cancelBody(reason: string, by: SalesCancelBy, choices: number): SalesCancel {
  const typed = reason.trim();
  return { ...(typed ? { reason: typed } : {}), ...(choices > 1 ? { by } : {}) };
}

/** With confirmation required the academy cancels; else teacher or student once it ended. */
export function SalesCancelLesson({ lessonId, choices, onClose }: SalesCancelLessonProps) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const [reason, setReason] = useState('');
  const [by, setBy] = useState<SalesCancelBy>(choices[0] ?? 'admin');
  const cancel = useSalesCancel(lessonId);
  const a = t.sales.lessonActions;
  if (cancel.isSuccess) return <Note>{a.cancelled}</Note>;
  const failure = cancel.isError ? rescheduleFailure(cancel.error, cycle, tz) : null;
  const body = cancelBody(reason, by, choices.length);
  const submit = () => (cancel.isPending ? undefined : cancel.mutate(body));
  const pills = choices.map((value) => ({ value, label: CANCEL_BY_LABEL[value] }));
  return (
    <View style={{ gap: 10 }}>
      {pills.length > 1 ? (
        <View style={{ gap: 6 }}>
          <SectionLabel>{t.lessons.cancelBy}</SectionLabel>
          <FilterPills
            items={pills}
            value={by}
            onChange={setBy}
            accessibilityLabel={t.lessons.cancelBy}
            role="radiogroup"
          />
        </View>
      ) : null}
      <Field label={a.reason} placeholder={a.reasonHint} value={reason} onChangeText={setReason} />
      {failure ? <ErrorLine message={failure.kind === 'error' ? failure.text : t.common.error} /> : null}
      <InlineConfirm
        tone="danger"
        message={a.cancelTitle}
        confirmLabel={cancel.isPending ? t.common.saving : a.confirmCancel}
        cancelLabel={t.common.back}
        onConfirm={submit}
        onCancel={onClose}
      />
    </View>
  );
}
