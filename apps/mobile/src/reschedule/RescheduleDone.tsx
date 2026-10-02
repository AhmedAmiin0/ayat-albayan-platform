import { lessonStatusStyle, type LessonView } from '@ab/shared';
import { View } from 'react-native';
import { whenText } from '@/booking/slots';
import { t } from '@/lib/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { StatusChip } from '@/ui/StatusChip';
import type { Scope } from './reschedule-body';

export interface RescheduleDoneProps {
  /** The API's answer: the new lesson (for a series, its first lesson). */
  moved: LessonView;
  scope: Scope;
  /** The family's zone, for the student's clock. */
  tz: string;
  onClose: () => void;
}

/**
 * The move landed: the new time, the new lesson's status («يحتاج تأكيد» until the guardian answers)
 * and that the WhatsApp confirmation is on its way (the API queued it with the move).
 */
export function RescheduleDone({ moved, scope, tz, onClose }: RescheduleDoneProps) {
  const { color } = useTheme();
  const text = { fontFamily: type.ui[500], fontSize: type.size.body, lineHeight: type.lineHeight(type.size.body), color: color.ink };
  return (
    <View style={{ gap: 12, padding: 16, borderRadius: shape.radius.lg, backgroundColor: color.okSoft }}>
      <AppText
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={{ ...text, fontFamily: type.ui[700], color: color.ok }}
      >
        {scope === 'rule' ? t.reschedule.seriesMoved : t.lessons.rescheduled}
      </AppText>
      <AppText style={text}>{t.reschedule.newWhen.replace('{when}', whenText(moved.starts_at, tz))}</AppText>
      <StatusChip {...lessonStatusStyle[moved.status]} label={t.enums.lessonStatus[moved.status]} />
      <AppText style={{ ...text, color: color.ink2 }}>{t.reschedule.guardianNote}</AppText>
      <Button label={t.reschedule.done} onPress={onClose} />
    </View>
  );
}
