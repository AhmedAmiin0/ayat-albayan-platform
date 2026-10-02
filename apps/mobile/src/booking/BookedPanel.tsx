import type { BookingResult } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { NuqtaGlyph } from '@/ui/NuqtaGlyph';
import { type, useTheme } from '@/theme';
import { whenText } from './slots';

export interface BookedPanelProps {
  result: BookingResult;
  teacherName: string;
  /** The family's zone, for the lesson's local time. */
  tz: string;
  onDone: () => void;
}

/**
 * After POST /booking 201: the lesson the API created (its own starts_at, so a replayed booking
 * shows the truth), the queued WhatsApp confirmation, and the way back to the conversation.
 */
export function BookedPanel({ result, teacherName, tz, onDone }: BookedPanelProps) {
  const { color } = useTheme();
  const first = [...result.lessons].sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
  const line = {
    fontFamily: type.ui[500],
    fontSize: type.size.body,
    lineHeight: type.lineHeight(type.size.body),
    color: color.ink,
  };
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <NuqtaGlyph shape="fill" color={color.ok} size={14} />
        <AppText
          accessibilityRole="alert"
          style={{
            fontFamily: type.display,
            fontSize: type.size.h2,
            lineHeight: type.lineHeight(type.size.h2, true),
            color: color.ink,
          }}
        >
          {t.booking.booked}
        </AppText>
      </View>
      {first ? (
        <AppText style={line}>
          {t.booking.firstLesson.replace('{when}', whenText(first.starts_at, tz))}
        </AppText>
      ) : null}
      <AppText style={line}>{t.today.withTeacher.replace('{teacher}', teacherName)}</AppText>
      {result.message_ids.length > 0 ? (
        <AppText style={{ ...line, fontSize: type.size.sm, color: color.ink2 }}>
          {t.booking.confirmationNote}
        </AppText>
      ) : null}
      <Button label={t.booking.mobile.backToLead} onPress={onDone} />
    </View>
  );
}
