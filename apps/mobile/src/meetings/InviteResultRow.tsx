import type { MeetingInviteResult } from '@ab/shared';
import { Share, View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { StatusChip } from '@/ui/StatusChip';
import { notSentHint, resultLabel } from './invite-text';

const R = t.meetingInvites.results;

/**
 * One recipient: its name, what happened («أُرسلت», «أُرسل إشعار في التطبيق», «النافذة مغلقة» with
 * the hint), and for a family or a phone «شارك الرابط والدعوة» (the text carries the personal link).
 */
export function InviteResultRow({ result }: { result: MeetingInviteResult }) {
  const { color } = useTheme();
  const ok = result.status === 'sent';
  const closed = result.status === 'window_closed';
  const text = result.invitation_text;
  const hint = notSentHint(result);
  return (
    <View style={{ gap: 6, paddingVertical: 8, borderTopWidth: 1, borderColor: color.rule }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <AppText numberOfLines={1} style={{ flex: 1, fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink }}>
          {result.display_name}
        </AppText>
        <StatusChip tone={ok ? 'ok' : closed ? 'act' : 'neutral'} glyph={ok ? 'fill' : 'hollow'} label={resultLabel(result)} size="sm" />
      </View>
      {hint ? <Note>{hint}</Note> : null}
      {text ? (
        <Button
          variant="secondary"
          label={R.share}
          accessibilityLabel={`${R.share} — ${result.display_name}`}
          onPress={() => void Share.share({ message: text }).catch(() => undefined)}
        />
      ) : null}
    </View>
  );
}
