import {
  BODY_SLOTS,
  lessonParams,
  LESSON_TIME_PARAMS,
  needsLesson,
  prefillParams,
  renderTemplateBody,
  type BodySlot,
  type TemplateParamsInput,
  type TemplateView,
  type ThreadLesson,
  threadTemplateSchema,
} from '@ab/shared';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { ButtonRow } from '@/core/ui/actions';
import { Field } from '@/core/ui/form/Field';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { ErrorLine } from '../ErrorLine';
import { TemplatePreview } from './TemplatePreview';
import type { Outgoing } from '../thread/hooks/use-thread';
import { useClockCycle, whenIn } from '@/core/lib/clock';

type Position = BodySlot;
const POSITIONS: readonly Position[] = BODY_SLOTS;
const NAMES: Record<string, string | undefined> = t.inbox.composer.paramNames;

interface TemplateFormProps {
  template: TemplateView;
  lessons: readonly ThreadLesson[];
  /** The thread's display name (guardian ?? lead's WhatsApp name ?? teacher): contact_name starts as it. */
  contactName?: string | null;
  onBack: () => void;
  onSend: (out: Outgoing) => void;
}

/**
 * One approved template's params (docs/12 H4), each by its name; a lesson time comes from the
 * lesson picked (rule 6: never typed, and in the recipient's tz), which also fills the names and
 * the meeting code. The meeting code when it has a link button, and the live preview.
 */
export function TemplateForm({ template, lessons, contactName, onBack, onSend }: TemplateFormProps) {
  const cycle = useClockCycle();
  const [params, setParams] = useState<TemplateParamsInput>(() => prefillParams(template, { contactName }));
  const [lessonId, setLessonId] = useState('');
  const [missing, setMissing] = useState(false);
  const positions = POSITIONS.slice(0, template.params.length);
  const withButton = template.buttons.some((b) => b.type === 'url');
  const withLesson = needsLesson(template.params);
  const set = (key: Position | 'button', value: string) => setParams((p) => ({ ...p, [key]: value }));
  const pick = (id: string) => {
    const lesson = lessons.find((l) => l.id === id);
    setLessonId(id);
    if (lesson) setParams((p) => ({ ...p, ...lessonParams(template, lesson) }));
  };

  const send = () => {
    const filled = positions.every((n) => params[n]?.trim()) && (!withButton || params.button?.trim());
    const parsed = threadTemplateSchema.safeParse({ key: template.key, params });
    if (!filled || !parsed.success || (withLesson && !lessonId)) return setMissing(true);
    const { key, params: clean } = parsed.data;
    // The thread row shows what the API stores for a template row: the rendered body, no footer.
    const preview = renderTemplateBody(template.body_ar, clean);
    onSend({ kind: 'template', key, params: clean, preview, ...(lessonId ? { lessonId } : {}) });
  };

  return (
    <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
      {withLesson && lessons.length === 0 ? <ErrorLine message={t.inbox.composer.noLessons} /> : null}
      {withLesson && lessons.length > 0 ? (
        <FilterPills
          role="radiogroup"
          accessibilityLabel={t.inbox.composer.pickLesson}
          items={lessons.map((l) => ({ value: l.id, label: whenIn(new Date(l.starts_at), l.tz, cycle) }))}
          value={lessonId}
          onChange={pick}
        />
      ) : null}
      {positions.map((n, i) => {
        const name = template.params[i] ?? '';
        return (
          <Field
            key={n}
            label={NAMES[name] ?? t.inbox.composer.param.replace('{n}', n)}
            editable={!LESSON_TIME_PARAMS.includes(name)}
            value={params[n] ?? ''}
            onChangeText={(v) => set(n, v)}
          />
        );
      })}
      {withButton ? (
        <Field
          ltr
          autoCapitalize="none"
          label={t.inbox.composer.button}
          value={params.button ?? ''}
          onChangeText={(v) => set('button', v)}
        />
      ) : null}
      <TemplatePreview template={template} params={params} />
      {missing ? <ErrorLine message={withLesson && !lessonId ? t.inbox.composer.pickLesson : t.common.required} /> : null}
      <ButtonRow>
        <Button label={t.inbox.composer.send} onPress={send} />
        <Button variant="secondary" label={t.common.back} onPress={onBack} />
      </ButtonRow>
    </ScrollView>
  );
}
