import { I18nManager, View } from 'react-native';
import { physicalRow } from '../shared/physical-row';
import { t } from '@/core/lib/i18n/i18n';
import { useTheme } from '@/theme';
import { IconButton } from '@/core/ui/primitives/IconButton';
import { AttachFile } from '../composer/AttachFile';
import { QuoteButton } from '../composer/quote/QuoteButton';
import { SendIcon, TemplateIcon } from '../shared/chat-icons';
import { ComposerInput } from '../composer/ComposerInput';
import { SavedRepliesButton } from '../saved-replies/SavedRepliesButton';

interface OpenRowProps {
  phone: string;
  text: string;
  onText: (text: string) => void;
  /** The box lost focus (a tap on the chat): closes the «/» list. */
  onLeave?: () => void;
  /** Staff (not a teacher): «الردود السريعة» in the row. */
  staff: boolean;
  onTemplate: () => void;
  onReplies: () => void;
  onFileError: (message: string | null) => void;
  /** «عرض سعر» (staff with pricing.read); absent → no button. */
  onQuote?: (() => void) | undefined;
  onSend: () => void;
  /** The text or a staged file is on its way: one «أرسل» at a time. */
  sending: boolean;
}

/**
 * The open window's one row, physical left → right as WhatsApp in Arabic and English alike (owner
 * 2026-10-27): [template] [replies] [quote] [file] [text] [send], each icon 44pt.
 */
export function OpenRow(p: OpenRowProps) {
  const { color } = useTheme();
  return (
    <View testID="open-row" style={{ flexDirection: physicalRow(I18nManager.isRTL).direction, alignItems: 'flex-end', gap: 6 }}>
      <IconButton label={t.inbox.composer.sendTemplate} onPress={p.onTemplate}>
        <TemplateIcon color={color.lapis} />
      </IconButton>
      {p.staff ? <SavedRepliesButton open onPress={p.onReplies} /> : null}
      {p.onQuote ? <QuoteButton onPress={p.onQuote} /> : null}
      <AttachFile phone={p.phone} onError={p.onFileError} />
      <ComposerInput value={p.text} onChange={p.onText} onBlur={p.onLeave} />
      <IconButton variant="filled" label={t.inbox.composer.send} disabled={p.sending} onPress={p.onSend}>
        <SendIcon color={color.onLapis} />
      </IconButton>
    </View>
  );
}
