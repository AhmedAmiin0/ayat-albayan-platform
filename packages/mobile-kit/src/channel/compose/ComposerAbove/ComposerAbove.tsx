import type { ChannelMessageView } from '@ab/shared';
import { View } from 'react-native';
import { QuoteBar } from '../../../chat-ui/quote/QuoteBar';
import { Spinner } from '../../../chat-ui/voice/Spinner';
import { t } from '../../../lib/i18n/i18n';
import { type, useTheme } from '../../../theme';
import { AppText } from '../../../ui/primitives/AppText';
import { QuoteGlyph } from '../../bubble/QuoteGlyph';
import { quoteSender, quoteText } from '../../bubble/quote-text';
import { ROLE_INK } from '../../bubble/role-ink';

interface ComposerAboveProps {
  /** A refusal or a failure in words, or null. */
  problem: string | null;
  uploading: boolean;
  recording: boolean;
  /** The message being answered: its quote bar with ✕. */
  replyTo: ChannelMessageView | null;
  onCancelReply: () => void;
}

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
          glyph={<QuoteGlyph kind={p.replyTo.kind} deleted={p.replyTo.deleted} />}
          tone={ROLE_INK[p.replyTo.sender_role]}
          onCancel={p.onCancelReply}
        />
      ) : null}
    </>
  );
}
