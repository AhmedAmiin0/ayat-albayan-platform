import { CANCEL_BY, type CancelBy, type CancelRequest, type LessonView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { SectionLabel } from '@/students/SectionLabel';
import { Field } from '@/ui/Field';
import { FilterPills } from '@/ui/FilterPills';
import { InlineConfirm } from '@/ui/InlineConfirm';

type Scope = CancelRequest['scope'];

const SCOPES = (['one', 'rule'] as const).map((s) => ({ value: s, label: t.lessons.scope[s] }));
const BY = CANCEL_BY.map((b) => ({ value: b, label: t.lessons.by[b] }));

export interface CancelLessonProps {
  lesson: LessonView;
  onSubmit: (cancel: CancelRequest) => void;
  onClose: () => void;
}

/**
 * «إلغاء الحلقة» (R-SCH-07, docs/10 route 9): this lesson or the rest of its series, who cancelled
 * (a student's cancellation is an excuse), and the reason the API requires. No preset «مين»: it
 * decides the status and whether the lesson counts, so the admin picks it.
 */
export function CancelLesson({ lesson, onSubmit, onClose }: CancelLessonProps) {
  const [scope, setScope] = useState<Scope>('one');
  const [by, setBy] = useState<CancelBy | ''>('');
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);
  const submit = () => {
    setTried(true);
    if (by !== '' && reason.trim() !== '') onSubmit({ scope, by, reason: reason.trim() });
  };
  return (
    <View style={{ gap: 10 }}>
      {/* A lesson outside a series has no «كل اللي بعدها» (the API answers 400 no_rule). */}
      {lesson.rule_id ? (
        <View style={{ gap: 6 }}>
          <SectionLabel>{t.lessons.scopeLabel}</SectionLabel>
          <FilterPills
            items={SCOPES}
            value={scope}
            onChange={setScope}
            accessibilityLabel={t.lessons.scopeLabel}
            role="radiogroup"
          />
        </View>
      ) : null}
      <View style={{ gap: 6 }}>
        <SectionLabel>{t.lessons.cancelBy}</SectionLabel>
        <FilterPills<CancelBy | ''>
          items={BY}
          value={by}
          onChange={setBy}
          accessibilityLabel={t.lessons.cancelBy}
          role="radiogroup"
        />
      </View>
      <Field
        label={t.lessons.reason}
        placeholder={t.lessons.reasonHint}
        value={reason}
        onChangeText={setReason}
      />
      {tried && (by === '' || reason.trim() === '') ? <ErrorLine message={t.common.required} /> : null}
      <InlineConfirm
        message={t.lessons.cancelTitle}
        confirmLabel={t.lessons.cancelSubmit}
        cancelLabel={t.common.back}
        onConfirm={submit}
        onCancel={onClose}
      />
    </View>
  );
}
