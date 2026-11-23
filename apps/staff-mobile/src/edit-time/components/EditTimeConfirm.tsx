import type { LessonView, TimeEditMode } from '@ab/shared';
import { Switch, View } from 'react-native';
import { t, shape, type, useTheme, AppText } from '@ab/mobile-kit';
import { chosenStart, isBookable, isChanged, lengthOf, willNotify, type EditState } from '@/edit-time/lib/edit-time-body';
import { changeLine, teacherLine } from '@/edit-time/lib/edit-time-text';
import { useClockCycle, useViewerTz, zoneNote } from '@/core/lib/clock';

export interface EditTimeConfirmProps {
  lesson: LessonView;
  mode: TimeEditMode;
  state: EditState;
  now: Date;
  /** The payout is locked, so a length-change notice would promise what the save cannot do. */
  payoutLocked: boolean;
  onNotify: (notify: boolean) => void;
}

/** A correction leaves attendance and status alone; guardian toggle only for a later start. */
export function EditTimeConfirm({ lesson, mode, state, now, payoutLocked, onNotify }: EditTimeConfirmProps) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const { color } = useTheme();
  const text = { fontFamily: type.ui[500], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink2 };
  if (!isBookable(state.durationMin)) return null;
  if (!isChanged(lesson, state)) return <AppText style={text}>{t.editTime.unchanged}</AppText>;
  const correct = mode === 'correct';
  return (
    <View style={{ gap: 6 }}>
      <AppText accessibilityLiveRegion="polite" style={{ ...text, fontFamily: type.ui[700], color: color.ink }}>
        {changeLine(lesson, state, { tz, cycle })}
      </AppText>
      <AppText style={text}>{zoneNote(tz)}</AppText>
      <AppText style={text}>{teacherLine(lesson, chosenStart(lesson, state.picked), cycle)}</AppText>
      {willNotify(lesson, state, now) ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: shape.control.touch }}>
          <Switch
            value={state.notify}
            onValueChange={onNotify}
            accessibilityLabel={t.editTime.notify}
            trackColor={{ true: color.lapis, false: color.ruleInput }}
          />
          <AppText style={{ ...text, flex: 1, color: color.ink }}>{t.editTime.notify}</AppText>
        </View>
      ) : null}
      <AppText style={text}>{t.editTime.sameLesson}</AppText>
      {correct ? <AppText style={text}>{t.editTime.heldNote}</AppText> : null}
      {correct && !payoutLocked && state.durationMin !== lengthOf(lesson) ? <AppText style={text}>{t.editTime.payoutWarn}</AppText> : null}
      {correct ? <AppText style={text}>{t.editTime.pdfRefresh}</AppText> : null}
      {correct && state.reason.trim() === '' ? <AppText style={text}>{t.editTime.error.reason_required}</AppText> : null}
    </View>
  );
}
