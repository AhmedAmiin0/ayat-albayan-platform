import { Switch, View } from 'react-native';
import { t } from '@/lib/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { chosenStart, isChanged, willNotify, type EditState } from './edit-time-body';
import { changeLine, teacherLine } from './edit-time-text';
import type { EditableLesson, TimeEditMode } from './types';

export interface EditTimeConfirmProps {
  lesson: EditableLesson;
  mode: TimeEditMode;
  state: EditState;
  now: Date;
  onNotify: (notify: boolean) => void;
}

/**
 * Before «احفظ التعديل»: «{من} ← {إلى}» in Riyadh time, the teacher's own clock for the new start,
 * that it is the same lesson (report and payments stay), and for a move that a series changes with
 * «غيّر الميعاد». The guardian toggle appears only when a WhatsApp confirmation would go out (a
 * move to a later start; never for a correction or a length-only change).
 */
export function EditTimeConfirm({ lesson, mode, state, now, onNotify }: EditTimeConfirmProps) {
  const { color } = useTheme();
  const text = { fontFamily: type.ui[500], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink2 };
  if (!isChanged(lesson, state)) return null;
  return (
    <View style={{ gap: 6 }}>
      <AppText accessibilityLiveRegion="polite" style={{ ...text, fontFamily: type.ui[700], color: color.ink }}>
        {changeLine(lesson, state)}
      </AppText>
      <AppText style={text}>{t.availability.tzHint.replace('{tz}', t.runningHead.riyadh)}</AppText>
      <AppText style={text}>{teacherLine(lesson, chosenStart(lesson, state.picked))}</AppText>
      {willNotify(lesson, state, now) ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
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
      {mode === 'move' ? <AppText style={text}>{t.editTime.vsReschedule}</AppText> : null}
    </View>
  );
}
