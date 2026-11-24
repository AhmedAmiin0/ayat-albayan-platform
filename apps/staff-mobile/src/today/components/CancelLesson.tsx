import { CANCEL_BY, type CancelBy, type CancelRequest, type LessonView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t, Field, FilterPills, ErrorLine } from '@ab/mobile-kit';
import { SectionLabel } from '@/core/ui/surface/SectionLabel';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';

type Scope = CancelRequest['scope'];

const scopePills = () => (['one', 'rule'] as const).map((s) => ({ value: s, label: t.lessons.scope[s] }));
const byPills = () => CANCEL_BY.map((b) => ({ value: b, label: t.lessons.by[b] }));

interface CancelLessonProps {
  lesson: LessonView;
  onSubmit: (cancel: CancelRequest) => void;
  onClose: () => void;
}

/** No preset canceller (R-SCH-07, docs/10 route 9): it decides the status and whether it counts. */
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
      {/* A lesson outside a series cannot cancel later ones (the API answers 400 no_rule). */}
      {lesson.rule_id ? (
        <View style={{ gap: 6 }}>
          <SectionLabel>{t.lessons.scopeLabel}</SectionLabel>
          <FilterPills
            items={scopePills()}
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
          items={byPills()}
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
        tone="danger"
        message={t.lessons.cancelTitle}
        confirmLabel={t.lessons.cancelSubmit}
        cancelLabel={t.common.back}
        onConfirm={submit}
        onCancel={onClose}
      />
    </View>
  );
}
