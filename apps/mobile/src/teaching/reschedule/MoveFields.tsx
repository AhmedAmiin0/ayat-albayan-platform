import type { LessonView } from '@ab/shared';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { ConflictNotice, ruleFromSlot } from '@/booking';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { DayChips } from '@/inbox/qualification/components/DayChips';
import { t } from '@/core/lib/i18n/i18n';
import { FormLabel } from '@/core/ui/form/FormLabel';
import { Button } from '@/core/ui/primitives/Button';
import { FilterPills } from '@/core/ui/form/FilterPills';
import type { useReschedule } from './queries';
import { repeatDays, rescheduleBody, seriesDays, type Scope } from './reschedule-body';
import { useRescheduleFailure, type RescheduleFailure } from './reschedule-errors';
import { SlotPicker } from './SlotPicker';

const scopePills = () =>
  (['one', 'rule'] as const).map((s) => ({ value: s, label: t.lessons.scope[s] }));

interface Props {
  lesson: LessonView;
  /** A bookable length (lessonDuration). */
  durationMin: number;
  /** The family's zone. */
  tz: string;
  move: ReturnType<typeof useReschedule>;
  scope: Scope;
  onScope: (scope: Scope) => void;
  /** «سبب تغيير الموعد» (docs/47): its text, and its field shown above the button. */
  reason: { text: string; field: ReactNode };
}

/**
 * This lesson or it and every later one, a free slot of the same teacher (and, for the series, the
 * days it repeats on: the old ones moved along, the slot's own day fixed), then «غيّر الميعاد». A
 * clash that appeared since the slots loaded comes back as a 409 with «اختار ميعاد تاني»; booking
 * over it with a reason stays on the web.
 */
export function MoveFields({ lesson, durationMin, tz, move, scope, onScope, reason }: Props) {
  const [startsAt, setStartsAt] = useState<string | null>(null);
  // null = untouched: the old rule's days shifted to the new slot (seriesDays).
  const [picked, setByday] = useState<number[] | null>(null);
  const byday = picked ?? (startsAt ? seriesDays(lesson, startsAt, tz) : []);
  const failure = useRescheduleFailure(move);
  const pick = (slot: string | null) => {
    move.reset();
    setStartsAt(slot);
    setByday(null);
  };
  const submit = () => {
    const input = { lesson, scope, byday, reason: reason.text };
    const body = startsAt ? rescheduleBody({ ...input, startsAt }) : null;
    if (body) move.mutate(body);
  };
  const rescope = (s: Scope) => {
    pick(null); // a slot fine for this lesson alone may be before it, which a series refuses
    onScope(s);
  };
  return (
    <View style={{ gap: 16 }}>
      {/* A lesson outside a series has no «كل اللي بعدها» (the API answers 400 no_rule). */}
      {lesson.rule_id ? <ScopeChoice value={scope} onChange={rescope} /> : null}
      {failure?.kind === 'conflict' ? (
        <ConflictNotice lines={failure.lines} onChangeSlot={() => pick(null)} />
      ) : (
        <SlotPicker
          lesson={lesson}
          durationMin={durationMin}
          tz={tz}
          value={startsAt}
          onPick={pick}
          fromLessonDay={scope === 'rule'}
        />
      )}
      {scope === 'rule' && startsAt ? (
        <SeriesDays startsAt={startsAt} tz={tz} value={byday} onChange={setByday} />
      ) : null}
      {reason.field}
      <Submit
        failure={failure}
        pending={move.isPending}
        ready={startsAt !== null}
        onPress={submit}
      />
    </View>
  );
}

/** A plain failure under the button (a clash shows in place of the slots), then «غيّر الميعاد». */
function Submit(p: {
  failure: RescheduleFailure | null;
  pending: boolean;
  ready: boolean;
  onPress: () => void;
}) {
  return (
    <>
      {p.failure?.kind === 'error' ? <ErrorLine message={p.failure.text} /> : null}
      <Button
        label={p.pending ? t.common.saving : t.lessons.rescheduleSubmit}
        onPress={p.onPress}
        busy={p.pending}
        disabled={!p.ready}
      />
    </>
  );
}

/** «أيام الحلقة» of the moved series: the new slot's day fixed, the others free. */
function SeriesDays(p: {
  startsAt: string;
  tz: string;
  value: readonly number[];
  onChange: (days: number[]) => void;
}) {
  return (
    <View style={{ gap: 6 }}>
      <FormLabel>{t.booking.pickDays}</FormLabel>
      <DayChips
        value={repeatDays(p.startsAt, p.tz, p.value)}
        onChange={p.onChange}
        locked={ruleFromSlot(p.startsAt, p.tz).weekday}
        accessibilityLabel={t.booking.pickDays}
      />
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
