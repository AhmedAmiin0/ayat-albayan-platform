import type { TrialDateResult } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { NuqtaGlyph } from '@/core/ui/primitives/NuqtaGlyph';
import { whenLines } from './trial-date-text';

export interface TrialDateDoneProps {
  /** The API's answer: its own starts_at, so a replayed request shows the truth. */
  result: TrialDateResult;
  teacherName: string;
  /** The family's zone. */
  tz: string;
  onClose: () => void;
}

/** After POST …/trial-date 201: «نُقلت الحلقة التجريبية…» or «تم حجز…», the time, the teacher, the note. */
export function TrialDateDone({ result, teacherName, tz, onClose }: TrialDateDoneProps) {
  const { color } = useTheme();
  const at = whenLines(result.starts_at, tz);
  const line = { fontFamily: type.ui[500], fontSize: type.size.body, lineHeight: type.lineHeight(type.size.body), color: color.ink };
  const small = { ...line, fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink2 };
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <NuqtaGlyph shape="fill" color={color.ok} size={14} />
        <AppText
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{ flexShrink: 1, fontFamily: type.display, fontSize: type.size.h2, lineHeight: type.lineHeight(type.size.h2, true), color: color.ink }}
        >
          {result.moved_from_id ? t.trialDate.doneMoved : t.trialDate.done}
        </AppText>
      </View>
      <AppText style={line}>{at.when}</AppText>
      {at.family ? <AppText style={small}>{at.family}</AppText> : null}
      {teacherName ? <AppText style={line}>{t.today.withTeacher.replace('{teacher}', teacherName)}</AppText> : null}
      <AppText style={small}>{t.trialDate.doneNote}</AppText>
      <Button label={t.trialDate.close} onPress={onClose} />
    </View>
  );
}
