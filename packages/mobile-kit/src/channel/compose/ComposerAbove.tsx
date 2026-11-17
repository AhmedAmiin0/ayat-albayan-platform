import type { ChannelMessageView } from '@ab/shared';
import { View } from 'react-native';
import { QuoteBar } from '../../chat-ui/quote/QuoteBar';
import { Spinner } from '../../chat-ui/voice/Spinner';
import { t } from '../../lib/i18n/i18n';
import { type, useTheme } from '../../theme';
import { AppText } from '../../ui/primitives/AppText';
import { FILE_ICON, quoteSender, quoteText } from '../bubble/quote-text';

interface ComposerAboveProps {
  /** A refusal or a failure in words, or null. */
  problem: string | null;
  uploading: boolean;
  recording: boolean;
  /** The message being answered: its quote bar with ✕. */
  replyTo: ChannelMessageView | null;
  onCancelReply: () => void;
}

/** Over the typing bar: why a send failed, «جارٍ رفع الملف…», «جارٍ التسجيل…», the quote. */
export function ComposerAbove(p: ComposerAboveProps) {
  const { color } = useTheme();
  const small = { fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs) };
  const m = t.studentChannel.media;
  return (
    <>
      {p.problem ? (
        <AppText accessibilityRole="alert" style={{ ...small, color: color.bad }}>
          {p.problem}
        </AppText>
      ) : null}
      {p.uploading ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Spinner color={color.ink3} size={16} />
          <AppText style={{ ...small, color: color.ink2 }}>{m.uploading}</AppText>
        </View>
      ) : null}
      {p.recording ? (
        <AppText accessibilityRole="alert" style={{ ...small, color: color.bad }}>
          {m.recording}
        </AppText>
      ) : null}
      {p.replyTo ? (
        <QuoteBar
          sender={quoteSender(p.replyTo)}
          text={quoteText(p.replyTo)}
          icon={FILE_ICON[p.replyTo.kind]}
          onCancel={p.onCancelReply}
        />
      ) : null}
    </>
  );
}
