import { DURATIONS, type LessonView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { FormLabel } from '@/core/ui/form/FormLabel';
import { SlotPicker } from '@/teaching/reschedule/SlotPicker';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Field } from '@/core/ui/form/Field';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { CorrectTimes } from './CorrectTimes';
import { isBookable, REASON_MAX, type EditState } from '@/edit-time/lib/edit-time-body';
import { lengthText } from '@/edit-time/lib/edit-time-text';
import type { TimeEditMode } from '@/edit-time/lib/types';

const pills = DURATIONS.map((d) => ({ value: String(d), label: lengthText(d) }));

export interface EditTimeFieldsProps {
  lesson: LessonView;
  mode: TimeEditMode;
  state: EditState;
  /** The family's zone: the small clocks. */
  tz: string;
  now: Date;
  onPick: (startsAt: string) => void;
  onDuration: (durationMin: number) => void;
  onReason: (reason: string) => void;
}

/**
 * The new length (pills, 30 / 45 / 60 / 90), the start (a move: the day's free starts of the
 * teacher at 15-minute steps, this lesson not counted against itself; a correction: same-day times
 * ending by now) and the reason (optional for a move, required for a correction).
 */
export function EditTimeFields({ lesson, mode, state, tz, now, onPick, onDuration, onReason }: EditTimeFieldsProps) {
  const { color } = useTheme();
  const note = { fontFamily: type.ui[500], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink2 };
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 6 }}>
        <FormLabel>{t.editTime.duration}</FormLabel>
        <FilterPills
          items={pills}
          value={String(state.durationMin)}
          onChange={(v) => onDuration(Number(v))}
          accessibilityLabel={t.editTime.duration}
          role="radiogroup"
        />
      </View>
      {mode === 'correct' ? (
        <CorrectTimes lesson={lesson} durationMin={state.durationMin} tz={tz} now={now} value={state.picked} onPick={onPick} />
      ) : !isBookable(state.durationMin) ? (
        // An odd recorded length has no slot grid (the API takes 30 / 45 / 60 / 90): pick a length first.
        <AppText style={note}>{t.editTime.pickLength}</AppText>
      ) : (
        <SlotPicker
          lesson={lesson}
          durationMin={state.durationMin}
          tz={tz}
          value={state.picked}
          onPick={onPick}
          edit={{ stepMin: 15, excludeLessonId: lesson.id }}
        />
      )}
      <Field
        label={t.editTime.reason}
        required={mode === 'correct'}
        placeholder={t.editTime.reasonHint}
        value={state.reason}
        onChangeText={onReason}
        maxLength={REASON_MAX}
      />
    </View>
  );
}
