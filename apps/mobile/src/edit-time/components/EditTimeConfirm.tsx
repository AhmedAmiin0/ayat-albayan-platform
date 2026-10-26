import { Switch, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { chosenStart, isBookable, isChanged, lengthOf, willNotify, type EditState } from '../lib/edit-time-body';
import { changeLine, teacherLine } from '../lib/edit-time-text';
import type { EditableLesson, TimeEditMode } from '../lib/types';

export interface EditTimeConfirmProps {
  lesson: EditableLesson;
  mode: TimeEditMode;
  state: EditState;
  now: Date;
  /** The month's payout is locked: «المدة اتغيرت…» would be a promise the save cannot keep. */
  payoutLocked: boolean;
  onNotify: (notify: boolean) => void;
}

/**
 * Before «احفظ التعديل»: nothing changed yet says so (a disabled button needs its reason), else
 * «{من} ← {إلى}» in Riyadh time, the teacher's own clock for the new start, that it is the same
 * lesson, and for a correction what it leaves alone (attendance, status) and what it moves (the
 * teacher's payout when the length changed, the report file). The guardian toggle appears only
 * when a WhatsApp confirmation would go out (a move to a later start).
 */
export function EditTimeConfirm({ lesson, mode, state, now, payoutLocked, onNotify }: EditTimeConfirmProps) {
  const { color } = useTheme();
  const text = { fontFamily: type.ui[500], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink2 };
  if (!isBookable(state.durationMin)) return null; // «اختار مدة الحلقة الأول» already says it
  if (!isChanged(lesson, state)) return <AppText style={text}>{t.editTime.unchanged}</AppText>;
  const correct = mode === 'correct';
  return (
    <View style={{ gap: 6 }}>
      <AppText accessibilityLiveRegion="polite" style={{ ...text, fontFamily: type.ui[700], color: color.ink }}>
        {changeLine(lesson, state)}
      </AppText>
      <AppText style={text}>{t.availability.tzHint.replace('{tz}', t.runningHead.riyadh)}</AppText>
      <AppText style={text}>{teacherLine(lesson, chosenStart(lesson, state.picked))}</AppText>
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
