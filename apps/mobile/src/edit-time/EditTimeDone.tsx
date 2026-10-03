import { View } from 'react-native';
import { whenText } from '@/booking/slots';
import { t } from '@/lib/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { NuqtaGlyph } from '@/ui/NuqtaGlyph';
import type { TimeEditResult } from './types';

export interface EditTimeDoneProps {
  /** The API's answer: the same lesson, its new time, and what the edit set in motion. */
  done: TimeEditResult;
  /** The family's zone, for the student's clock. */
  tz: string;
  onClose: () => void;
}

/**
 * The edit landed: «الوقت اتعدّل» (with the guardian's WhatsApp confirmation when one was queued),
 * the new time, and the two follow-ups the API reports: a draft payout month that must be
 * calculated again, and a report PDF that is re-made (the guardian is not sent it twice).
 */
export function EditTimeDone({ done, tz, onClose }: EditTimeDoneProps) {
  const { color } = useTheme();
  const text = { fontFamily: type.ui[500], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink2 };
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <NuqtaGlyph shape="fill" color={color.ok} size={14} />
        <AppText
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{ fontFamily: type.display, fontSize: type.size.h2, lineHeight: type.lineHeight(type.size.h2, true), color: color.ink }}
        >
          {done.notified > 0 ? t.editTime.savedNotified : t.editTime.saved}
        </AppText>
      </View>
      <AppText style={{ ...text, fontSize: type.size.body, lineHeight: type.lineHeight(type.size.body), color: color.ink }}>
        {t.reschedule.newWhen.replace('{when}', whenText(done.lesson.starts_at, tz))}
      </AppText>
      {done.payout === 'draft_stale' ? <AppText style={text}>{t.editTime.payoutDraft}</AppText> : null}
      {done.pdf_refresh ? <AppText style={text}>{t.editTime.pdfRefresh}</AppText> : null}
      <Button label={t.reschedule.done} onPress={onClose} />
    </View>
  );
}
