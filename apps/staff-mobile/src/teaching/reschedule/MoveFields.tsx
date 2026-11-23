import type { LessonView } from '@ab/shared';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { ConflictNotice, ruleFromSlot } from '@/booking';
import { DayChips } from '@/inbox/qualification/components/DayChips';
import { t, Button, FilterPills, ErrorLine, FormLabel } from '@ab/mobile-kit';
import type { useReschedule } from './queries';
import { repeatDays, rescheduleBody, seriesDays, type Scope } from './reschedule-body';
import { useRescheduleFailure, type RescheduleFailure } from './reschedule-errors';
import { LessonSlotPicker } from './LessonSlotPicker';

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
  /** Optional reason (docs/47) shown to the teacher in her file. */
  reason: { text: string; field: ReactNode };
}

/** A new clash since the slots loaded answers 409; booking over a clash stays on the web. */
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
      {/* A lesson outside a series cannot move later ones (the API answers 400 no_rule). */}
      {lesson.rule_id ? <ScopeChoice value={scope} onChange={rescope} /> : null}
      {failure?.kind === 'conflict' ? (
        <ConflictNotice lines={failure.lines} onChangeSlot={() => pick(null)} />
      ) : (
        <LessonSlotPicker
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

/** A clash shows in place of the slots; other failures under the button. */
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

/** The new slot's day is fixed, the others free. */
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
