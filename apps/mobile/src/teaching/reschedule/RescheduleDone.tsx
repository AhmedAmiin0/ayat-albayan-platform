import { lessonStatusStyle, type LessonView } from '@ab/shared';
import { View } from 'react-native';
import { whenText } from '@/booking/shared/slots';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { NuqtaGlyph } from '@/core/ui/primitives/NuqtaGlyph';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import type { Scope } from './reschedule-body';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';

interface RescheduleDoneProps {
  /** The API's answer: the new lesson (for a series, its first lesson); sales get its time and status only. */
  moved: Pick<LessonView, 'starts_at' | 'status'>;
  scope: Scope;
  /** The family's zone, for the student's clock. */
  tz: string;
  onClose: () => void;
}

/**
 * The move landed, said like the booking's success (BookedPanel): a fill nuqta and an Amiri title,
 * then the new time, the new lesson's status («يحتاج تأكيد» until the guardian answers) and that
 * the WhatsApp confirmation is on its way (the API queued it with the move). No box.
 */
export function RescheduleDone({ moved, scope, tz, onClose }: RescheduleDoneProps) {
  const cycle = useClockCycle();
  const viewerZone = useViewerTz();
  const viewer = { tz: viewerZone, cycle };
  const { color } = useTheme();
  const text = { fontFamily: type.ui[500], fontSize: type.size.body, lineHeight: type.lineHeight(type.size.body), color: color.ink };
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <NuqtaGlyph shape="fill" color={color.ok} size={14} />
        <AppText
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{ fontFamily: type.display, fontSize: type.size.h2, lineHeight: type.lineHeight(type.size.h2, true), color: color.ink }}
        >
          {scope === 'rule' ? t.reschedule.seriesMoved : t.lessons.rescheduled}
        </AppText>
      </View>
      <AppText style={text}>{t.reschedule.newWhen.replace('{when}', whenText(moved.starts_at, tz, viewer))}</AppText>
      <StatusChip {...lessonStatusStyle[moved.status]} label={t.enums.lessonStatus[moved.status]} />
      <AppText style={{ ...text, fontSize: type.size.sm, color: color.ink2 }}>{t.reschedule.guardianNote}</AppText>
      <Button label={t.reschedule.done} onPress={onClose} />
    </View>
  );
}
