import type { LessonView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { ConflictNotice } from '@/booking/ConflictNotice';
import { ErrorLine } from '@/inbox/ErrorLine';
import { DayChips } from '@/inbox/qualification/DayChips';
import { t } from '@/lib/i18n';
import { FormLabel } from '@/payments/FormLabel';
import { Button } from '@/ui/Button';
import { FilterPills } from '@/ui/FilterPills';
import type { useReschedule } from './queries';
import { repeatDays, rescheduleBody, type Scope } from './reschedule-body';
import { rescheduleFailure } from './reschedule-errors';
import { SlotPicker } from './SlotPicker';

const scopePills = () => (['one', 'rule'] as const).map((s) => ({ value: s, label: t.lessons.scope[s] }));

export interface MoveFieldsProps {
  lesson: LessonView;
  /** A bookable length (lessonDuration). */
  durationMin: number;
  /** The family's zone. */
  tz: string;
  move: ReturnType<typeof useReschedule>;
  scope: Scope;
  onScope: (scope: Scope) => void;
}

/**
 * This lesson or it and every later one, a free slot of the same teacher (and, for the series, the
 * days it repeats on), then «غيّر الميعاد». A clash that appeared since the slots loaded comes back
 * as a 409 with «اختار ميعاد تاني»; booking over it with a reason stays on the web.
 */
export function MoveFields({ lesson, durationMin, tz, move, scope, onScope }: MoveFieldsProps) {
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [byday, setByday] = useState<number[]>([]);
  const failure = move.isError ? rescheduleFailure(move.error) : null;
  const pick = (slot: string | null) => {
    move.reset();
    setStartsAt(slot);
  };
  const submit = () => {
    const body = startsAt ? rescheduleBody({ lesson, scope, startsAt, byday }) : null;
    if (body) move.mutate(body);
  };
  return (
    <View style={{ gap: 16 }}>
      {/* A lesson outside a series has no «كل اللي بعدها» (the API answers 400 no_rule). */}
      {lesson.rule_id ? (
        <ScopeChoice
          value={scope}
          onChange={(s) => {
            move.reset();
            onScope(s);
          }}
        />
      ) : null}
      {failure?.kind === 'conflict' ? (
        <ConflictNotice lines={failure.lines} onChangeSlot={() => pick(null)} />
      ) : (
        <SlotPicker lesson={lesson} durationMin={durationMin} tz={tz} value={startsAt} onPick={pick} />
      )}
      {scope === 'rule' && startsAt ? (
        <View style={{ gap: 6 }}>
          <FormLabel>{t.booking.pickDays}</FormLabel>
          <DayChips value={repeatDays(startsAt, tz, byday)} onChange={setByday} />
        </View>
      ) : null}
      {failure?.kind === 'error' ? <ErrorLine message={failure.text} /> : null}
      <Button label={t.lessons.rescheduleSubmit} onPress={submit} busy={!startsAt || move.isPending} />
    </View>
  );
}

/** «التغيير يشمل»: الحلقة دي بس | الحلقة دي وكل اللي بعدها. */
function ScopeChoice({ value, onChange }: { value: Scope; onChange: (scope: Scope) => void }) {
  return (
    <View style={{ gap: 6 }}>
      <FormLabel>{t.lessons.scopeLabelMove}</FormLabel>
      <FilterPills
        items={scopePills()}
        value={value}
        onChange={onChange}
        accessibilityLabel={t.lessons.scopeLabelMove}
        role="radiogroup"
      />
    </View>
  );
}
